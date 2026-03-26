from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from .models import Component, Project, ChatSession, ChatMessage
from .serializers import (
    ComponentSerializer, ProjectSerializer,
    ChatInputSerializer, ChatMessageSerializer
)
from .ml_engine import (
    detect_intent, extract_components,
    get_project_recommendations, format_bot_response
)


class ChatView(APIView):
    """Main chatbot endpoint — receives user messages and returns AI recommendations."""

    def post(self, request):
        serializer = ChatInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.validated_data['message']
        session_id = serializer.validated_data.get('session_id')

        # Get or create session
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id)
            except ChatSession.DoesNotExist:
                session = ChatSession.objects.create()
        else:
            session = ChatSession.objects.create()

        # Save user message
        user_msg = ChatMessage.objects.create(
            session=session,
            role='user',
            content=user_message
        )

        # Process with ML engine
        intent = detect_intent(user_message)
        components = []
        recommendations = {'ready': [], 'suggestions': []}

        if intent == 'project_request':
            components = extract_components(user_message)
            all_projects = Project.objects.prefetch_related(
                'projectcomponent_set__component'
            ).all()
            recommendations = get_project_recommendations(components, all_projects)

        # Generate bot response
        bot_response = format_bot_response(
            intent=intent,
            components=components,
            recommendations=recommendations
        )

        # Save bot message
        bot_msg = ChatMessage.objects.create(
            session=session,
            role='bot',
            content=bot_response['message']
        )

        # Link matched components and suggested projects
        if components:
            matched_comp_objs = Component.objects.filter(
                name__in=[c.title() for c in components]
            )
            bot_msg.matched_components.set(matched_comp_objs)

        if recommendations:
            project_ids = [item['project'].id for item in recommendations.get('ready', [])]
            project_ids += [item['project'].id for item in recommendations.get('suggestions', [])]
            bot_msg.suggested_projects.set(project_ids)

        return Response({
            'session_id': session.id,
            'response': bot_response,
            'message_id': bot_msg.id,
        }, status=status.HTTP_200_OK)


class ComponentListView(generics.ListAPIView):
    """Lists all available robotics components."""
    queryset = Component.objects.all().order_by('category', 'name')
    serializer_class = ComponentSerializer


class ProjectListView(generics.ListAPIView):
    """Lists all available robotics project ideas."""
    queryset = Project.objects.prefetch_related(
        'projectcomponent_set__component'
    ).all().order_by('difficulty', 'title')
    serializer_class = ProjectSerializer


class ChatHistoryView(APIView):
    """Retrieves chat history for a specific session."""

    def get(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id)
        except ChatSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        messages = session.messages.all()
        serializer = ChatMessageSerializer(messages, many=True)
        return Response({
            'session_id': session.id,
            'messages': serializer.data,
        })

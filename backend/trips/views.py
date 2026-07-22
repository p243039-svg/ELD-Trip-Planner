from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Trip
from .serializers import TripInputSerializer, TripListSerializer, TripDetailSerializer
from .services.routing import plan_route
from .services.hos_engine import compute_trip


class PlanTripView(APIView):
    """
    POST /api/plan-trip/
    Geocodes locations, fetches route, runs HOS simulation, saves to DB.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TripInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            # 1. Get route geometry + distance
            route = plan_route(
                current_location=data['current_location'],
                pickup_location=data['pickup_location'],
                dropoff_location=data['dropoff_location'],
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': f'Routing service error: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            # 2. Run HOS simulation
            daily_logs, stops = compute_trip(
                total_distance_miles=route['distance_miles'],
                current_cycle_used=data['current_cycle_used'],
                route_geometry=route['geometry'],
            )
        except Exception as e:
            return Response(
                {'error': f'HOS computation error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 3. Attach stops to route
        route['stops'] = stops

        # 4. Compose full response payload
        route_data = {
            'route': route,
            'daily_logs': daily_logs,
        }

        # 5. Persist to DB
        trip = Trip.objects.create(
            user=request.user,
            current_location=data['current_location'],
            pickup_location=data['pickup_location'],
            dropoff_location=data['dropoff_location'],
            current_cycle_used=data['current_cycle_used'],
            route_data=route_data,
        )

        return Response({
            'trip_id': trip.id,
            **route_data,
        }, status=status.HTTP_201_CREATED)


class TripListView(generics.ListAPIView):
    """GET /api/trips/  — Return authenticated user's trip history."""
    serializer_class = TripListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user)


class TripDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE /api/trips/<id>/  — Get or delete a specific trip."""
    serializer_class = TripDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user)

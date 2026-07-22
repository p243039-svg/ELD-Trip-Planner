from rest_framework import serializers
from .models import Trip


class TripInputSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_used = serializers.FloatField(min_value=0.0, max_value=70.0)


class TripListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the history list view."""
    distance_miles = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    total_days = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = (
            'id', 'current_location', 'pickup_location', 'dropoff_location',
            'current_cycle_used', 'distance_miles', 'duration_hours',
            'total_days', 'route_data', 'created_at',
        )

    def _route(self, obj):
        return (obj.route_data or {}).get('route', {})

    def get_distance_miles(self, obj):
        return self._route(obj).get('distance_miles')

    def get_duration_hours(self, obj):
        return self._route(obj).get('duration_hours')

    def get_total_days(self, obj):
        logs = (obj.route_data or {}).get('daily_logs', [])
        return len(logs)


class TripDetailSerializer(serializers.ModelSerializer):
    """Full serializer including route data (used for plan result + detail view)."""
    class Meta:
        model = Trip
        fields = (
            'id', 'current_location', 'pickup_location', 'dropoff_location',
            'current_cycle_used', 'route_data', 'created_at',
        )

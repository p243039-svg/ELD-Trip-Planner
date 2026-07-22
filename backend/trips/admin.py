from django.contrib import admin
from .models import Trip


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'current_location', 'pickup_location', 'dropoff_location', 'current_cycle_used', 'created_at')
    list_filter = ('user',)
    search_fields = ('current_location', 'pickup_location', 'dropoff_location', 'user__username')
    readonly_fields = ('route_data', 'created_at', 'updated_at')

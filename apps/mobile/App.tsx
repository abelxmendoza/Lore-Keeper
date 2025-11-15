import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { supabase } from './lib/supabase';

interface PhotoMetadata {
  uri: string;
  width: number;
  height: number;
  exif?: {
    DateTimeOriginal?: string;
    GPSLatitude?: number;
    GPSLongitude?: number;
    Make?: string;
    Model?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  // Apple metadata
  isScreenshot?: boolean;
  isHidden?: boolean;
  isFavorite?: boolean;
  fileSize?: number;
  dateTime?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
  notes?: string;
  attendees?: string[];
  isAllDay?: boolean;
  calendarName?: string;
}

export default function App() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [hasCalendarPermission, setHasCalendarPermission] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      const { status: calendarStatus } = await Calendar.requestCalendarPermissionsAsync();
      
      if (mediaStatus === 'granted' && locationStatus === 'granted') {
        setHasPermissions(true);
        loadPhotos();
      } else {
        Alert.alert(
          'Permissions Required',
          'Please grant photo library and location permissions to use this feature.'
        );
      }

      if (calendarStatus === 'granted') {
        setHasCalendarPermission(true);
        loadCalendarEvents();
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      // Get all calendars
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      // Get events from the last 30 days and next 30 days
      const now = new Date();
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const allEvents: CalendarEvent[] = [];

      for (const calendar of calendars) {
        try {
          const events = await Calendar.getEventsAsync(
            [calendar.id],
            startDate,
            endDate
          );

          for (const event of events) {
            // Skip all-day events that are too generic or recurring without context
            if (event.allDay && !event.location && !event.notes) {
              continue;
            }

            allEvents.push({
              id: event.id || `${calendar.id}-${event.startDate}`,
              title: event.title || 'Untitled Event',
              startDate: event.startDate.toISOString(),
              endDate: event.endDate?.toISOString(),
              location: event.location,
              notes: event.notes,
              attendees: event.attendees?.map(a => a.name || a.email).filter(Boolean) as string[],
              isAllDay: event.allDay,
              calendarName: calendar.title
            });
          }
        } catch (error) {
          console.error(`Error loading events from calendar ${calendar.title}:`, error);
        }
      }

      // Sort by date
      allEvents.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      setCalendarEvents(allEvents);
      console.log(`Loaded ${allEvents.length} calendar events`);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      Alert.alert('Error', 'Failed to load calendar events');
    }
  };

  const syncCalendarEvents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please sign in first');
        return;
      }

      const response = await fetch('http://localhost:4000/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ events: calendarEvents })
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Success', 
          `Created ${result.entriesCreated} journal entries from ${result.totalProcessed} calendar events`
        );
      } else {
        Alert.alert('Error', 'Failed to sync calendar events');
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
      Alert.alert('Error', 'Failed to sync calendar events');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 200 // Load more to filter out irrelevant ones
      });

      const photosWithMetadata: PhotoMetadata[] = await Promise.all(
        assets.assets.map(async (asset) => {
          // Get asset info with Apple's metadata
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
          
          // Skip screenshots
          if (assetInfo.mediaSubtypes?.includes(MediaLibrary.MediaType.photoScreenshot)) {
            return null;
          }

          // Skip hidden photos
          if (assetInfo.isHidden) {
            return null;
          }

          // Skip very small photos (likely thumbnails)
          if (asset.width < 500 || asset.height < 500) {
            return null;
          }

          // Get location from asset if available
          let location = null;
          if (assetInfo.location) {
            location = {
              latitude: assetInfo.location.latitude,
              longitude: assetInfo.location.longitude
            };
          } else {
            // Fallback to current location (less accurate)
            try {
              const currentLocation = await Location.getCurrentPositionAsync({});
              location = {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude
              };
            } catch {
              // No location available
            }
          }
          
          return {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            location,
            exif: {
              DateTimeOriginal: asset.creationTime ? new Date(asset.creationTime).toISOString() : undefined,
              Make: assetInfo.localUri ? 'iPhone' : undefined, // Infer from localUri presence
            },
            // Apple metadata
            isScreenshot: assetInfo.mediaSubtypes?.includes(MediaLibrary.MediaType.photoScreenshot) || false,
            isHidden: assetInfo.isHidden || false,
            isFavorite: assetInfo.isFavorite || false,
            fileSize: assetInfo.size || 0,
            dateTime: asset.creationTime ? new Date(asset.creationTime).toISOString() : undefined
          };
        })
      );

      // Filter out null values (filtered photos)
      const filteredPhotos = photosWithMetadata.filter((photo): photo is PhotoMetadata => photo !== null);
      
      // Further filter: prefer photos with location or recent dates
      const relevantPhotos = filteredPhotos.filter(photo => {
        // Must have location OR be recent (within last 30 days)
        const isRecent = photo.dateTime && 
          (Date.now() - new Date(photo.dateTime).getTime()) < 30 * 24 * 60 * 60 * 1000;
        
        return photo.location || isRecent;
      });

      setPhotos(relevantPhotos);
      console.log(`Loaded ${relevantPhotos.length} relevant photos out of ${assets.assets.length} total`);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    }
  };

  // Removed individual photo upload - using batch sync instead

  const syncAllPhotos = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please sign in first');
        return;
      }

      // Extract metadata from photos and sync to create journal entries
      // Backend will filter out irrelevant photos
      const photosToSync = photos.map(photo => ({
        metadata: {
          latitude: photo.location?.latitude,
          longitude: photo.location?.longitude,
          dateTime: photo.dateTime || photo.exif?.DateTimeOriginal,
          dateTimeOriginal: photo.exif?.DateTimeOriginal || photo.dateTime,
          cameraMake: photo.exif?.Make,
          cameraModel: photo.exif?.Model,
          width: photo.width,
          height: photo.height,
          fileSize: photo.fileSize,
          isScreenshot: photo.isScreenshot,
          isHidden: photo.isHidden,
          isFavorite: photo.isFavorite,
          assetSubtype: photo.isScreenshot ? 'screenshot' : undefined
        }
      }));

      const response = await fetch('http://localhost:4000/api/photos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ photos: photosToSync })
      });

      const result = await response.json();
      
      if (result.success) {
        const skippedMsg = result.skipped > 0 
          ? `\n\nSkipped ${result.skipped} irrelevant photos (screenshots, duplicates, low-quality)`
          : '';
        Alert.alert(
          'Success', 
          `Created ${result.entriesCreated} journal entries from ${result.totalProcessed} photos${skippedMsg}`
        );
      } else {
        Alert.alert('Error', 'Failed to sync photos');
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync photos');
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermissions) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting permissions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lore Keeper</Text>
        <Text style={styles.subtitle}>Background Sync</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Background Sync</Text>
        <Text style={styles.infoText}>
          Photos and calendar events will be processed in the background to automatically create journal entries.
          No photos will be stored - only metadata is used to generate your lore.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.syncButton}
        onPress={syncAllPhotos}
        disabled={loading || !hasPermissions}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating journal entries...' : `Sync ${photos.length} Photos`}
        </Text>
      </TouchableOpacity>

      {hasCalendarPermission && (
        <TouchableOpacity
          style={[styles.syncButton, styles.calendarButton]}
          onPress={syncCalendarEvents}
          disabled={loading || calendarEvents.length === 0}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Syncing...' : `Sync ${calendarEvents.length} Calendar Events`}
          </Text>
        </TouchableOpacity>
      )}

      {photos.length > 0 && (
        <View style={styles.statsBox}>
          <Text style={styles.statsText}>
            📸 {photos.length} photos ready to sync
          </Text>
          <Text style={styles.statsSubtext}>
            Journal entries will be created automatically
          </Text>
        </View>
      )}

      {calendarEvents.length > 0 && (
        <View style={styles.statsBox}>
          <Text style={styles.statsText}>
            📅 {calendarEvents.length} calendar events ready to sync
          </Text>
          <Text style={styles.statsSubtext}>
            Events will be logged to your timeline
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030014',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8f5ff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a855f7',
  },
  syncButton: {
    backgroundColor: '#7c3aed',
    padding: 16,
    margin: 20,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarButton: {
    backgroundColor: '#9333ea',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#1e1b4b',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  infoTitle: {
    color: '#f8f5ff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#c4b5fd',
    fontSize: 14,
    lineHeight: 20,
  },
  statsBox: {
    backgroundColor: '#312e81',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  statsText: {
    color: '#f8f5ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsSubtext: {
    color: '#a855f7',
    fontSize: 12,
  },
  text: {
    color: '#f8f5ff',
    fontSize: 16,
  },
});


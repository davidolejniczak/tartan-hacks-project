import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen({ navigation, notifications = [], userProfile = { name: 'User', fragments: [] } }) {
  // Safe handling for the name split logic
  const firstName = userProfile.name ? userProfile.name.split(' ')[0] : 'there';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#FFF9F0', '#F0F9FF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.logoText}>Mosaic</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton}>
              <Text>👥 Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.profileButton]}>
              <Text>✨ Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.welcomeSubtitle}>
            You have {notifications.length} new nearby connection{notifications.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Nearby Connections</Text>
            {notifications.map((notif) => (
              <View key={notif.id} style={styles.notifCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifMessage}>{notif.message}</Text>
                  <Text style={styles.notifSubtext}>📍 {notif.distance} • {notif.time}</Text>
                </View>
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Your Mosaic Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ Your Mosaic</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>View All →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {userProfile.fragments.map((fragment) => (
              <TouchableOpacity 
                key={fragment.id} 
                style={[styles.gridItem, { backgroundColor: `${fragment.color}40`, borderColor: fragment.color }]}
              >
                <Text style={styles.fragmentEmoji}>{fragment.content}</Text>
                <Text style={styles.fragmentTitle}>{fragment.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D', // Note: Native Text doesn't support linear-gradient fills easily
  },
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8F5FF',
  },
  profileButton: { backgroundColor: '#B5E8FF' },
  scrollContent: { padding: 20 },
  welcomeSection: { marginBottom: 25 },
  welcomeTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  welcomeSubtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  linkText: { color: '#4ECDC4', fontWeight: '600' },
  notifCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  notifMessage: { fontWeight: '600', fontSize: 15 },
  notifSubtext: { color: '#999', fontSize: 13, marginTop: 4 },
  viewButton: { backgroundColor: '#FFB5E8', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  viewButtonText: { fontWeight: '600', fontSize: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%', // Creates a 2-column grid
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
  },
  fragmentEmoji: { fontSize: 40, marginBottom: 10 },
  fragmentTitle: { fontWeight: '600', fontSize: 14, color: '#333' }
});
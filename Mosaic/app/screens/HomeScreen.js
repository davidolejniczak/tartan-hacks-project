import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Dimensions,
  Alert,
  Animated,
  Easing,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('mosaic'); // mosaic, friends, profile
  const [showAddFragment, setShowAddFragment] = useState(false);
  const [newFragmentText, setNewFragmentText] = useState('');

  // --- DATA STATES ---
  const [fragments, setFragments] = useState([
    { id: 1, type: 'text', content: 'Design Philosophy', sub: 'Minimalism & Form', color: '#F8F9FA' },
    { id: 2, type: 'text', content: 'Architecture', sub: 'Brutalism Study', color: '#E8DFD8' },
    { id: 3, type: 'text', content: 'Curated Sounds', sub: 'Ambient / Lo-fi', color: '#D4C5BA' },
    { id: 4, type: 'text', content: 'Weekend Trek', sub: 'Blue Ridge Trail', color: '#C4B5A8' },
    { id: 5, type: 'text', content: 'Morning Ritual', sub: 'Pour over coffee', color: '#F1F3F5' },
    { id: 6, type: 'text', content: 'Art Direction', sub: 'Editorial Style', color: '#E9ECEF' },
  ]);

  // --- ANIMATION STATES ---
  const fragmentAnims = useRef({}).current;
  const fragmentPositions = useRef({}).current;
  const containerLayout = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const hasInitialized = useRef(false);

  // Fragment dimensions
  const FRAGMENT_WIDTH = (width - 64) / 2;
  const FRAGMENT_HEIGHT = 180;
  const FRAGMENT_SPACING = 20;

  const friends = [
    { id: 1, name: 'Jamie Chen', matchScore: 85, sharedFragments: 3 },
    { id: 2, name: 'Morgan Blake', matchScore: 72, sharedFragments: 2 },
    { id: 3, name: 'Sam Rodriguez', matchScore: 68, sharedFragments: 2 },
  ];

  // --- POSITION CALCULATION ---
  const calculatePosition = (index, total, centerX, centerY, existingPositions = {}) => {
    if (total === 0) return { x: centerX - FRAGMENT_WIDTH / 2, y: centerY - FRAGMENT_HEIGHT / 2 };

    if (index === 0) {
      // First fragment goes to center
      return { x: centerX - FRAGMENT_WIDTH / 2, y: centerY - FRAGMENT_HEIGHT / 2 };
    }

    // Calculate positions in a spiral pattern around center
    // Use a more distributed pattern for better spacing
    const layers = Math.ceil(Math.sqrt(total - 1));
    const itemsInLayer = index - 1;
    const layer = Math.floor(itemsInLayer / 6) + 1;
    const itemsInCurrentLayer = Math.min(6, total - 1 - (layer - 1) * 6);
    const positionInLayer = itemsInLayer % 6;

    const angleStep = (2 * Math.PI) / itemsInCurrentLayer;
    const baseRadius = (FRAGMENT_WIDTH + FRAGMENT_SPACING) * layer;

    // Try different radii until we find a non-overlapping position
    let radius = baseRadius;
    let attempts = 0;
    const maxAttempts = 30;
    const minDistance = FRAGMENT_WIDTH + FRAGMENT_SPACING;

    while (attempts < maxAttempts) {
      const angle = positionInLayer * angleStep;
      const x = centerX + radius * Math.cos(angle) - FRAGMENT_WIDTH / 2;
      const y = centerY + radius * Math.sin(angle) - FRAGMENT_HEIGHT / 2;

      // Check collision with existing fragments
      let hasCollision = false;
      for (const existingPos of Object.values(existingPositions)) {
        if (existingPos) {
          const dx = x - existingPos.x;
          const dy = y - existingPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
            hasCollision = true;
            break;
          }
        }
      }

      if (!hasCollision) {
        return { x, y };
      }

      // Increase radius and try again
      radius += FRAGMENT_SPACING * 0.5;
      attempts++;
    }

    // Fallback: use calculated position
    const angle = positionInLayer * angleStep;
    return {
      x: centerX + radius * Math.cos(angle) - FRAGMENT_WIDTH / 2,
      y: centerY + radius * Math.sin(angle) - FRAGMENT_HEIGHT / 2,
    };
  };

  // Initialize animations for fragments
  const initializeFragmentAnim = (fragmentId, targetX, targetY, isNew = false) => {
    if (!fragmentAnims[fragmentId]) {
      // New fragments start from outside screen, existing ones keep current position
      const startX = isNew ? width : (fragmentAnims[fragmentId]?.position?.x?.__getValue?.() || width);
      const startY = isNew ? height / 2 : (fragmentAnims[fragmentId]?.position?.y?.__getValue?.() || height / 2);

      fragmentAnims[fragmentId] = {
        position: new Animated.ValueXY({ x: startX, y: startY }),
        opacity: new Animated.Value(isNew ? 0 : 1),
        scale: new Animated.Value(isNew ? 0.8 : 1),
      };
    }
    fragmentPositions[fragmentId] = { x: targetX, y: targetY };
    return fragmentAnims[fragmentId];
  };

  // Animate fragment to position
  const animateFragmentToPosition = (fragmentId, targetX, targetY, delay = 0, isNew = false) => {
    const anim = fragmentAnims[fragmentId];
    if (!anim) return;

    Animated.parallel([
      Animated.spring(anim.position, {
        toValue: { x: targetX, y: targetY },
        tension: 30,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(anim.opacity, {
        toValue: 1,
        duration: isNew ? 800 : 600,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(anim.scale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Recalculate all fragment positions
  const recalculatePositions = (fragmentsList, isNewFragment = false) => {
    if (activeTab !== 'mosaic') return;

    const centerX = containerLayout.current.width / 2 || width / 2;
    const centerY = (containerLayout.current.height / 2 || height / 2) - 50;

    // Calculate positions sequentially to avoid overlaps
    const calculatedPositions = {};

    fragmentsList.forEach((fragment, index) => {
      // Use already calculated positions for collision detection
      const position = calculatePosition(index, fragmentsList.length, centerX, centerY, calculatedPositions);
      calculatedPositions[fragment.id] = position;

      const isNew = isNewFragment && index === 0;
      const anim = initializeFragmentAnim(fragment.id, position.x, position.y, isNew);

      // Animate to position with staggered delay
      // New fragments animate immediately, existing ones animate with delay to show push effect
      const delay = isNew ? 0 : (index * 80);
      animateFragmentToPosition(fragment.id, position.x, position.y, delay, isNew);
    });
  };

  // Update fragment positions when fragments change
  useEffect(() => {
    if (activeTab !== 'mosaic' || containerLayout.current.width === 0) return;

    // Small delay to ensure layout is measured
    const timer = setTimeout(() => {
      recalculatePositions(fragments, false);
    }, 100);

    return () => clearTimeout(timer);
  }, [fragments.length, activeTab]);

  // Handle initial layout measurement
  useEffect(() => {
    if (activeTab === 'mosaic' && containerLayout.current.width > 0) {
      recalculatePositions(fragments, false);
    }
  }, [activeTab]);

  // --- LOGIC ---
  const deleteFragment = (id) => {
    Alert.alert("Remove Fragment", "Remove this piece from your collection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          // Clean up animation refs
          delete fragmentAnims[id];
          delete fragmentPositions[id];
          setFragments(fragments.filter(f => f.id !== id));
        }
      }
    ]);
  };

  const addFragment = () => {
    if (newFragmentText.trim().length === 0) return;
    const newFrag = { id: Date.now(), type: 'text', content: newFragmentText, sub: 'New Entry', color: '#F8F9FA' };
    const updatedFragments = [newFrag, ...fragments];
    setFragments(updatedFragments);
    setNewFragmentText('');
    setShowAddFragment(false);

    // Recalculate positions with new fragment
    setTimeout(() => {
      recalculatePositions(updatedFragments, true);
    }, 50);
  };

  // --- RENDER TABS ---

  const renderMosaicTab = () => {
    const centerX = containerLayout.current.width / 2 || width / 2;
    const centerY = (containerLayout.current.height / 2 || height / 2) - 50;

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Mosaic</Text>
          <Text style={styles.sectionSubtitle}>{fragments.length} curated fragments</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowAddFragment(!showAddFragment)} style={styles.addButton}>
          <Text style={styles.addButtonText}>{showAddFragment ? 'Close' : '+ New Fragment'}</Text>
        </TouchableOpacity>

        {showAddFragment && (
          <View style={styles.addFragmentCard}>
            <TextInput
              style={styles.input}
              placeholder="What's on your mind?"
              placeholderTextColor="#A0A0A0"
              value={newFragmentText}
              onChangeText={setNewFragmentText}
              autoFocus
            />
            <TouchableOpacity activeOpacity={0.9} onPress={addFragment} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Add to Collection</Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={styles.fragmentContainer}
          onLayout={(event) => {
            const { width, height, x, y } = event.nativeEvent.layout;
            const prevWidth = containerLayout.current.width;
            containerLayout.current = { width, height, x, y };
            // Recalculate positions when layout is first measured or changes significantly
            if (prevWidth === 0 && width > 0) {
              setTimeout(() => {
                recalculatePositions(fragments, false);
              }, 100);
            }
          }}
        >
          {fragments.map((fragment, index) => {
            let anim = fragmentAnims[fragment.id];
            if (!anim) {
              // Initialize if not already done - start from outside for first fragment on initial load
              const position = calculatePosition(index, fragments.length, centerX, centerY);
              const isFirstLoad = !hasInitialized.current && index === 0;
              anim = initializeFragmentAnim(fragment.id, position.x, position.y, isFirstLoad);

              // Animate first fragment to center on initial load
              if (isFirstLoad && containerLayout.current.width > 0) {
                setTimeout(() => {
                  animateFragmentToPosition(fragment.id, position.x, position.y, 0, true);
                  hasInitialized.current = true;
                }, 200);
              } else if (!isFirstLoad) {
                hasInitialized.current = true;
              }
            }

            return (
              <Animated.View
                key={fragment.id}
                style={[
                  styles.fragmentCard,
                  { backgroundColor: fragment.color },
                  anim && {
                    opacity: anim.opacity,
                    transform: [
                      { translateX: anim.position.x },
                      { translateY: anim.position.y },
                      { scale: anim.scale },
                    ],
                  },
                ]}
              >
                <TouchableOpacity style={styles.deleteCircle} onPress={() => deleteFragment(fragment.id)}>
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
                <View style={styles.fragmentContent}>
                  <Text style={styles.fragmentSub}>{fragment.sub}</Text>
                  <Text style={styles.fragmentMain}>{fragment.content}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connections</Text>
        <Text style={styles.sectionSubtitle}>{friends.length} nearby matches</Text>
      </View>

      <View style={styles.friendsList}>
        {friends.map((friend, index) => (
          <View key={friend.id}>
            <TouchableOpacity activeOpacity={0.9} style={styles.friendCard}>
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>{friend.name.charAt(0)}</Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.friendMeta}>{friend.sharedFragments} shared fragments</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchScore}>{friend.matchScore}%</Text>
              </View>
            </TouchableOpacity>
            {index < friends.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <Text style={styles.profileName}>Alex Rivera</Text>
        <Text style={styles.profileBio}>Curating moments, collecting connections</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{fragments.length}</Text>
          <Text style={styles.statLabel}>Fragments</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{friends.length}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
      </View>

      <View style={styles.settingsList}>
        {['Edit Profile', 'Privacy Settings', 'Notifications'].map((item, i) => (
          <TouchableOpacity key={i} style={styles.settingItem}>
            <Text style={styles.settingText}>{item}</Text>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background} />
      <View style={styles.header}>
        <Text style={styles.logo}>Mosaic</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'mosaic' && renderMosaicTab()}
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </ScrollView>

      {/* Floating Bottom Navigation */}
      <View style={styles.bottomNav}>
        {['mosaic', 'friends', 'profile'].map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.navItem}>
            <View style={[styles.navIconBox, activeTab === tab && styles.navActive]}>
              <Text style={[styles.navText, activeTab === tab && styles.navTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFCFB' },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FDFCFB' },
  header: { paddingHorizontal: 32, paddingVertical: 20 },
  logo: { fontSize: 24, fontWeight: '300', color: '#1A1A1A', letterSpacing: 4 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 140 },
  tabContent: { flex: 1 },

  // Shared Styles
  sectionHeader: { marginBottom: 24 },
  sectionTitle: { fontSize: 36, fontWeight: '300', color: '#1A1A1A', letterSpacing: -1 },
  sectionSubtitle: { fontSize: 13, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E8E5E1', marginLeft: 70 },

  // Mosaic Tab
  addButton: { borderWidth: 1, borderColor: '#1A1A1A', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 32 },
  addButtonText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', letterSpacing: 1 },
  addFragmentCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#EEE' },
  input: { fontSize: 16, color: '#1A1A1A', marginBottom: 16 },
  submitButton: { backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitButtonText: { color: '#FFF', fontWeight: '600' },
  fragmentContainer: {
    width: width - 48,
    height: Math.max(height - 300, 600),
    position: 'relative',
    marginTop: 20,
    marginBottom: 40,
  },
  fragmentCard: {
    position: 'absolute',
    width: (width - 64) / 2,
    height: 180,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  deleteCircle: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  deleteIcon: { fontSize: 10, color: '#1A1A1A' },
  fragmentSub: { fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  fragmentMain: { fontSize: 16, fontWeight: '500', color: '#1A1A1A', lineHeight: 22 },

  // Friends Tab
  friendsList: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E5E1', overflow: 'hidden' },
  friendCard: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  friendAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8DFD8', justifyContent: 'center', alignItems: 'center' },
  friendAvatarText: { fontSize: 18, fontWeight: '300' },
  friendInfo: { flex: 1, marginLeft: 15 },
  friendName: { fontSize: 16, fontWeight: '500', color: '#1A1A1A' },
  friendMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  matchBadge: { backgroundColor: '#F1F3F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  matchScore: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },

  // Profile Tab
  profileHeader: { alignItems: 'center', marginVertical: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8DFD8', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { fontSize: 30, fontWeight: '300' },
  profileName: { fontSize: 24, fontWeight: '400', color: '#1A1A1A' },
  profileBio: { fontSize: 14, color: '#94A3B8', marginTop: 5 },
  statsContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginVertical: 20, borderWidth: 1, borderColor: '#E8E5E1' },
  statCard: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '300' },
  statLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#E8E5E1' },
  settingsList: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E5E1', overflow: 'hidden' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  settingText: { fontSize: 15, color: '#1A1A1A' },
  settingArrow: { color: '#94A3B8' },

  // Navigation
  bottomNav: { position: 'absolute', bottom: 40, left: 24, right: 24, height: 70, backgroundColor: '#1A1A1A', borderRadius: 35, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  navItem: { flex: 1, alignItems: 'center' },
  navIconBox: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  navActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  navText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  navTextActive: { color: '#FFF' }
});
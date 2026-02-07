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
  PanResponder,
  GestureResponderEvent,
  Modal,
} from 'react-native';
import { uploadSvgFragment } from '../comms/BackendManager';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const MOSAIC_ID = 1;
  const [activeTab, setActiveTab] = useState('mosaic'); // mosaic, friends, profile
  const [showAddFragment, setShowAddFragment] = useState(false);
  const [newFragmentText, setNewFragmentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFragment, setSelectedFragment] = useState(null);
  const [isEditingFragment, setIsEditingFragment] = useState(false);
  const [editFragmentContent, setEditFragmentContent] = useState('');
  const [editFragmentSub, setEditFragmentSub] = useState('');

  // --- DATA STATES ---
  // Modern minimal color palette: purples and blacks
  const modernColors = [
    '#5F5FFF', // primary purple
    '#191919', // rich black
    '#4A4AE8', // deep purple
    '#2E2E2E', // charcoal
    '#7575FF', // light purple
    '#3A3ACD', // royal purple
    '#0F0F0F', // near black
    '#8B8BFF', // soft purple
  ];

  const [fragments, setFragments] = useState([
    { id: 1, type: 'text', content: 'Design Philosophy', sub: 'Minimalism & Form', color: '#5F5FFF' },
    { id: 2, type: 'text', content: 'Architecture', sub: 'Brutalism Study', color: '#191919' },
    { id: 3, type: 'text', content: 'Curated Sounds', sub: 'Ambient / Lo-fi', color: '#4A4AE8' },
    { id: 4, type: 'text', content: 'Weekend Trek', sub: 'Blue Ridge Trail', color: '#2E2E2E' },
    { id: 5, type: 'text', content: 'Morning Ritual', sub: 'Pour over coffee', color: '#7575FF' },
    { id: 6, type: 'text', content: 'Art Direction', sub: 'Editorial Style', color: '#3A3ACD' },
  ]);

  // --- ANIMATION STATES ---
  const fragmentAnims = useRef({}).current;
  const fragmentPositions = useRef({}).current;
  const containerLayout = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const rotationAngle = useRef(0);
  const lastRotationAngle = useRef(0);
  const velocityAngle = useRef(0);
  const lastDx = useRef(0);
  const tileScales = useRef({}).current;
  const tileRotations = useRef({}).current;
  const tileWobbles = useRef({}).current;
  const hasInitialized = useRef(false);

  // Fragment dimensions
  const FRAGMENT_WIDTH = (width - 64) / 2;
  const FRAGMENT_HEIGHT = 180;
  const CENTER_FRAGMENT_WIDTH = 160;
  const CENTER_FRAGMENT_HEIGHT = 160;
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
      // Center fragment at the middle
      return { x: centerX - CENTER_FRAGMENT_WIDTH / 2, y: centerY - CENTER_FRAGMENT_HEIGHT / 2 };
    }

    // Calculate radial positions around center for surrounding fragments
    const surroundingFragments = total - 1;
    const angleStep = (2 * Math.PI) / surroundingFragments;
    const positionInCircle = index - 1;
    const angle = positionInCircle * angleStep;

    // Fixed radius around center fragment
    const baseRadius = 200;
    const x = centerX + baseRadius * Math.cos(angle) - FRAGMENT_WIDTH / 2;
    const y = centerY + baseRadius * Math.sin(angle) - FRAGMENT_HEIGHT / 2;

    return { x, y };
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
      tileScales[fragmentId] = new Animated.Value(1);
      tileRotations[fragmentId] = {
        rotateX: new Animated.Value(0),
        rotateY: new Animated.Value(0),
        rotateZ: new Animated.Value(Math.random() * 10 - 5), // Random initial tilt
      };
      tileWobbles[fragmentId] = new Animated.Value(0);
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
    ]).start(() => {
      // Start subtle wobble animation after settling
      startWobbleAnimation(fragmentId);
    });
  };

  // Continuous wobble animation for orbital tiles
  const startWobbleAnimation = (fragmentId) => {
    const wobble = tileWobbles[fragmentId];
    if (!wobble) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Create pan responder for rotating all tiles around center
  const createContainerPanResponder = () => {
    let touchStartY = 0;
    
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        lastRotationAngle.current = rotationAngle.current;
        velocityAngle.current = 0;
        lastDx.current = 0;
        
        // Store the Y position where touch started
        touchStartY = evt.nativeEvent.pageY;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        const centerX = containerLayout.current.width / 2;
        const centerY = (containerLayout.current.height / 2) - 50;

        // Determine if touch is in top or bottom half of screen
        const screenMidpoint = height / 2;
        const isTopHalf = touchStartY < screenMidpoint;
        
        // Top half: normal direction (drag right -> tiles move right)
        // Bottom half: inverted direction (drag right -> tiles move left)
        const directionMultiplier = isTopHalf ? 0.15 : -0.15;
        const rotationDelta = (dx / 250) * directionMultiplier;
        rotationAngle.current += rotationDelta;
        
        // Calculate velocity for momentum
        velocityAngle.current = dx - lastDx.current;
        lastDx.current = dx;

        // Update all surrounding tile positions based on rotation
        fragments.forEach((fragment, index) => {
          if (index === 0) return; // Skip center tile

          const baseRadius = 200;
          const angleStep = (2 * Math.PI) / (fragments.length - 1);
          const baseAngle = (index - 1) * angleStep;
          const currentAngle = baseAngle + rotationAngle.current;

          const newX = centerX + baseRadius * Math.cos(currentAngle) - FRAGMENT_WIDTH / 2;
          const newY = centerY + baseRadius * Math.sin(currentAngle) - FRAGMENT_HEIGHT / 2;

          const anim = fragmentAnims[fragment.id];
          if (anim) {
            anim.position.setValue({ x: newX, y: newY });
            
            // Add dynamic tilt based on rotation direction
            const tiltAngle = (velocityAngle.current / 10) * -1;
            const rotation = tileRotations[fragment.id];
            if (rotation) {
              rotation.rotateY.setValue(tiltAngle);
            }
          }
        });
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Determine if touch was in top or bottom half
        const screenMidpoint = height / 2;
        const isTopHalf = touchStartY < screenMidpoint;
        const directionMultiplier = isTopHalf ? 0.15 : -0.15;
        
        // Reset tile tilts
        fragments.forEach((fragment, index) => {
          if (index === 0) return;
          const rotation = tileRotations[fragment.id];
          if (rotation) {
            Animated.spring(rotation.rotateY, {
              toValue: 0,
              tension: 40,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        });

        // Momentum scrolling - continue rotation with decaying velocity
        const velocity = velocityAngle.current;
        const decayRate = 0.95;
        let currentVelocity = velocity;
        
        const updateMomentum = () => {
          if (Math.abs(currentVelocity) > 0.1) {
            const rotationDelta = (currentVelocity / 250) * directionMultiplier;
            rotationAngle.current += rotationDelta;
            currentVelocity *= decayRate;

            // Update all surrounding tile positions
            const centerX = containerLayout.current.width / 2;
            const centerY = (containerLayout.current.height / 2) - 50;

            fragments.forEach((fragment, index) => {
              if (index === 0) return;

              const baseRadius = 200;
              const angleStep = (2 * Math.PI) / (fragments.length - 1);
              const baseAngle = (index - 1) * angleStep;
              const currentAngle = baseAngle + rotationAngle.current;

              const newX = centerX + baseRadius * Math.cos(currentAngle) - FRAGMENT_WIDTH / 2;
              const newY = centerY + baseRadius * Math.sin(currentAngle) - FRAGMENT_HEIGHT / 2;

              const anim = fragmentAnims[fragment.id];
              if (anim) {
                anim.position.setValue({ x: newX, y: newY });
              }
            });

            requestAnimationFrame(updateMomentum);
          }
        };

        updateMomentum();
      },
    });
  };

  // Recalculate all fragment positions
  const recalculatePositions = (fragmentsList, isNewFragment = false) => {
    if (activeTab !== 'mosaic') return;

    const centerX = containerLayout.current.width / 2 || width / 2;
    const centerY = (containerLayout.current.height / 2 || height / 2) - 50;

    fragmentsList.forEach((fragment, index) => {
      if (index === 0) {
        // Center tile
        const position = calculatePosition(0, fragmentsList.length, centerX, centerY);
        const anim = initializeFragmentAnim(fragment.id, position.x, position.y, false);
        animateFragmentToPosition(fragment.id, position.x, position.y, 0, false);
      } else {
        // Surrounding tiles - calculate with current rotation angle
        const baseRadius = 200;
        const angleStep = (2 * Math.PI) / (fragmentsList.length - 1);
        const baseAngle = (index - 1) * angleStep;
        const currentAngle = baseAngle + rotationAngle.current;

        const newX = centerX + baseRadius * Math.cos(currentAngle) - FRAGMENT_WIDTH / 2;
        const newY = centerY + baseRadius * Math.sin(currentAngle) - FRAGMENT_HEIGHT / 2;

        const anim = initializeFragmentAnim(fragment.id, newX, newY, false);
        animateFragmentToPosition(fragment.id, newX, newY, index * 80, false);
      }
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
          // Animate out before removing
          const anim = fragmentAnims[id];
          if (anim) {
            Animated.parallel([
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.spring(anim.scale, {
                toValue: 0,
                tension: 40,
                friction: 6,
                useNativeDriver: true,
              }),
            ]).start(() => {
              // Clean up animation refs
              delete fragmentAnims[id];
              delete fragmentPositions[id];
              delete tileScales[id];
              delete tileRotations[id];
              delete tileWobbles[id];
              setFragments(fragments.filter(f => f.id !== id));
              setSelectedFragment(null);
            });
          } else {
            setFragments(fragments.filter(f => f.id !== id));
            setSelectedFragment(null);
          }
        }
      }
    ]);
  };

  const handleFragmentClick = (fragment) => {
    setSelectedFragment(fragment);
    setEditFragmentContent(fragment.content);
    setEditFragmentSub(fragment.sub);
    setIsEditingFragment(false);
  };

  const handleSaveFragmentEdit = () => {
    if (editFragmentContent.trim().length === 0) return;
    
    setFragments(fragments.map(f => 
      f.id === selectedFragment.id 
        ? { ...f, content: editFragmentContent, sub: editFragmentSub }
        : f
    ));
    
    setSelectedFragment({ ...selectedFragment, content: editFragmentContent, sub: editFragmentSub });
    setIsEditingFragment(false);
  };

  const handleCloseModal = () => {
    setSelectedFragment(null);
    setIsEditingFragment(false);
  };

  const addFragment = () => {
    if (newFragmentText.trim().length === 0) return;
    const colorIndex = fragments.length % modernColors.length;
    const newFrag = { id: Date.now(), type: 'text', content: newFragmentText, sub: 'New Entry', color: modernColors[colorIndex] };
    const updatedFragments = [newFrag, ...fragments];
    setFragments(updatedFragments);
    setNewFragmentText('');
    setShowAddFragment(false);

    // Recalculate positions with new fragment
    setTimeout(() => {
      recalculatePositions(updatedFragments, true);
    }, 50);
  };

  const handleUploadSvg = async () => {
    try {
      setIsUploading(true);
      let DocumentPicker;
      let FileSystem;

      try {
        DocumentPicker = await import('expo-document-picker');
        FileSystem = await import('expo-file-system');
      } catch (err) {
        Alert.alert(
          'Upload unavailable',
          'File picker requires a development build. Please use a dev build to upload SVGs.'
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/svg+xml',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets?.[0]?.uri;
      if (!fileUri) {
        Alert.alert('Upload failed', 'Could not read the selected file.');
        return;
      }

      const svg = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const response = await uploadSvgFragment(MOSAIC_ID, svg);
      if (response?.status !== 'success') {
        throw new Error(response?.detail || 'Upload failed');
      }

      const newFrag = {
        id: Date.now(),
        type: 'text',
        content: response?.data?.context || 'SVG Upload',
        sub: 'SVG Upload',
        color: modernColors[fragments.length % modernColors.length],
      };

      setFragments((prev) => {
        const updated = [newFrag, ...prev];
        setTimeout(() => {
          recalculatePositions(updated, true);
        }, 50);
        return updated;
      });

      setShowAddFragment(false);
    } catch (error) {
      Alert.alert('Upload failed', error?.message || 'Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- RENDER TABS ---

  const renderMosaicTab = () => {
    const centerX = containerLayout.current.width / 2 || width / 2;
    const centerY = (containerLayout.current.height / 2 || height / 2) - 50;
    const containerPanResponder = createContainerPanResponder();

    return (
      <View style={styles.tabContent}>
        <View style={styles.mosaicHeader}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Mosaic</Text>
            <Text style={styles.sectionSubtitle}>{fragments.length} curated fragments</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowAddFragment(!showAddFragment)} style={styles.addButtonMinimal}>
            <Text style={styles.addButtonMinimalText}>{showAddFragment ? '✕' : '+'}</Text>
          </TouchableOpacity>
        </View>

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

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleUploadSvg}
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
              disabled={isUploading}
            >
              <Text style={styles.uploadButtonText}>{isUploading ? 'Uploading…' : 'Upload SVG from Phone'}</Text>
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
          {...containerPanResponder.panHandlers}
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

            const isCenter = index === 0;
            const rotation = tileRotations[fragment.id];
            const wobble = tileWobbles[fragment.id];

            const handleTilePress = () => {
              handleFragmentClick(fragment);
            };

            // Interpolate wobble for subtle floating effect
            const wobbleTranslate = wobble ? wobble.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 5],
            }) : 0;

            // Interpolate rotation values
            const rotateXValue = rotation?.rotateX ? rotation.rotateX.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }) : '0deg';

            const rotateYValue = rotation?.rotateY ? rotation.rotateY : new Animated.Value(0);
            
            const rotateZValue = rotation?.rotateZ ? rotation.rotateZ.interpolate({
              inputRange: [-360, 360],
              outputRange: ['-360deg', '360deg'],
            }) : '0deg';

            return (
              <Animated.View
                key={fragment.id}
                style={[
                  styles.fragmentCard,
                  isCenter && styles.centerFragment,
                  { backgroundColor: fragment.color },
                  anim && {
                    opacity: anim.opacity,
                    transform: [
                      { translateX: anim.position.x },
                      { translateY: Animated.add(anim.position.y, wobbleTranslate) },
                      { perspective: 1000 },
                      { rotateX: rotateXValue },
                      { rotateY: rotateYValue.interpolate({
                          inputRange: [-45, 45],
                          outputRange: ['-45deg', '45deg'],
                        })
                      },
                      { rotateZ: rotateZValue },
                      { scale: Animated.multiply(anim.scale, tileScales[fragment.id] || 1) },
                    ],
                  },
                ]}
              >
                <TouchableOpacity 
                  style={styles.deleteCircle} 
                  onPress={() => deleteFragment(fragment.id)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleTilePress}
                  activeOpacity={0.95}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <View style={styles.fragmentContent}>
                    <Text style={[styles.fragmentSub, isCenter && styles.centerFragmentSub]}>{fragment.sub}</Text>
                    <Text style={[styles.fragmentMain, isCenter && styles.centerFragmentMain]}>{fragment.content}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.sectionHeader, { marginBottom: 32 }]}>
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
        <Text style={styles.logo}>Fragment</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={activeTab !== 'mosaic'}
      >
        {activeTab === 'mosaic' && renderMosaicTab()}
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </ScrollView>

      {/* Floating Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
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
      </View>

      {/* Fragment Detail Modal */}
      <Modal
        visible={selectedFragment !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: selectedFragment?.color || '#5F5FFF' }]}>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {!isEditingFragment ? (
                <>
                  <Text style={styles.modalSubtitle}>{selectedFragment?.sub}</Text>
                  <Text style={styles.modalTitle}>{selectedFragment?.content}</Text>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      onPress={() => setIsEditingFragment(true)} 
                      style={styles.modalEditButton}
                    >
                      <Text style={styles.modalEditButtonText}>Edit Fragment</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => deleteFragment(selectedFragment.id)} 
                      style={styles.modalDeleteButton}
                    >
                      <Text style={styles.modalDeleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalEditLabel}>Category</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFragmentSub}
                    onChangeText={setEditFragmentSub}
                    placeholder="e.g., Minimalism & Form"
                    placeholderTextColor="#999999"
                  />
                  
                  <Text style={styles.modalEditLabel}>Title</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFragmentContent}
                    onChangeText={setEditFragmentContent}
                    placeholder="e.g., Design Philosophy"
                    placeholderTextColor="#999999"
                  />
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      onPress={handleSaveFragmentEdit} 
                      style={styles.modalSaveButton}
                    >
                      <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => setIsEditingFragment(false)} 
                      style={styles.modalCancelButton}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  logo: { fontSize: 20, fontWeight: '500', color: '#000000', letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120 },
  tabContent: { flex: 1 },

  // Shared Styles
  mosaicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  sectionHeader: { flex: 1 },
  sectionTitle: { fontSize: 32, fontWeight: '600', color: '#000000', letterSpacing: -0.8 },
  sectionSubtitle: { fontSize: 14, color: '#666666', marginTop: 8, fontWeight: '400' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 60 },

  // Mosaic Tab
  addButtonMinimal: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  addButtonMinimalText: { fontSize: 24, color: '#FFFFFF', fontWeight: '300' },
  addFragmentCard: { backgroundColor: '#FAFAFA', padding: 24, borderRadius: 12, marginBottom: 32, borderWidth: 1, borderColor: '#F0F0F0' },
  input: { fontSize: 16, color: '#000000', marginBottom: 20, paddingVertical: 8, fontWeight: '400' },
  submitButton: { backgroundColor: '#5F5FFF', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  uploadButton: { marginTop: 12, borderWidth: 1.5, borderColor: '#E0E0E0', paddingVertical: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#FFFFFF' },
  uploadButtonDisabled: { opacity: 0.5 },
  uploadButtonText: { color: '#000000', fontWeight: '500', fontSize: 14 },
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
    borderRadius: 12,
    padding: 24,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 0,
    backfaceVisibility: 'hidden',
  },
  centerFragment: {
    width: 160,
    height: 160,
    borderRadius: 12,
    zIndex: 10,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  deleteCircle: { position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  deleteIcon: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  fragmentSub: { fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: '500' },
  fragmentMain: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', lineHeight: 24, letterSpacing: -0.3 },
  centerFragmentSub: { fontSize: 9, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: 0.5 },
  centerFragmentMain: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
  fragmentContent: { flex: 1, justifyContent: 'center', padding: 0 },

  // Friends Tab
  friendsList: { backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' },
  friendCard: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFFFFF' },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  friendAvatarText: { fontSize: 16, fontWeight: '600', color: '#000000' },
  friendInfo: { flex: 1, marginLeft: 16 },
  friendName: { fontSize: 16, fontWeight: '500', color: '#000000', marginBottom: 2 },
  friendMeta: { fontSize: 13, color: '#666666', marginTop: 2 },
  matchBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  matchScore: { fontSize: 13, fontWeight: '600', color: '#000000' },

  // Profile Tab
  profileHeader: { alignItems: 'center', marginVertical: 40 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 28, fontWeight: '600', color: '#000000' },
  profileName: { fontSize: 24, fontWeight: '600', color: '#000000', letterSpacing: -0.5 },
  profileBio: { fontSize: 15, color: '#666666', marginTop: 8, fontWeight: '400' },
  statsContainer: { flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 12, padding: 24, marginVertical: 24, borderWidth: 1, borderColor: '#F0F0F0' },
  statCard: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '600', color: '#000000' },
  statLabel: { fontSize: 13, color: '#666666', marginTop: 6, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#E5E5E5' },
  settingsList: { backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFFFFF' },
  settingText: { fontSize: 16, color: '#000000', fontWeight: '500' },
  settingArrow: { color: '#999999', fontSize: 18 },

  // Navigation
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 24, paddingHorizontal: 24, backgroundColor: 'transparent' },
  bottomNav: { height: 64, backgroundColor: '#000000', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  navItem: { flex: 1, alignItems: 'center' },
  navIconBox: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  navActive: { backgroundColor: '#5F5FFF' },
  navText: { color: '#666666', fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  navTextActive: { color: '#FFFFFF' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } },
  modalHeader: { height: 120, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 16 },
  modalCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600' },
  modalBody: { padding: 24 },
  modalSubtitle: { fontSize: 12, color: '#666666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: '500' },
  modalTitle: { fontSize: 28, fontWeight: '600', color: '#000000', marginBottom: 32, letterSpacing: -0.5 },
  modalActions: { gap: 12 },
  modalEditButton: { backgroundColor: '#5F5FFF', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  modalEditButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  modalDeleteButton: { borderWidth: 1.5, borderColor: '#E0E0E0', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  modalDeleteButtonText: { color: '#000000', fontSize: 15, fontWeight: '500' },
  modalEditLabel: { fontSize: 13, fontWeight: '600', color: '#000000', marginBottom: 8, marginTop: 16 },
  modalInput: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#000000', marginBottom: 8 },
  modalSaveButton: { backgroundColor: '#5F5FFF', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  modalSaveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  modalCancelButton: { borderWidth: 1.5, borderColor: '#E0E0E0', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  modalCancelButtonText: { color: '#000000', fontSize: 15, fontWeight: '500' },
});
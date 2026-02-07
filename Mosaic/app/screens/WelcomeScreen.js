import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions, 
  Animated,
  Easing 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const FRAGMENTS = [
  { id: 1, initialX: width / 2 - 140, initialY: height / 2 - 200, size: 120, rotation: -8, color: '#E8DFD8' },
  { id: 2, initialX: width / 2 + 20, initialY: height / 2 - 140, size: 110, rotation: 12, color: '#D4C5BA' },
  { id: 3, initialX: width / 2 - 60, initialY: height / 2 + 60, size: 130, rotation: -5, color: '#C4B5A8' },
];

export default function WelcomeScreen({ navigation }) {
  const [assembled, setAssembled] = useState(false);

  const fragmentAnims = useRef(
    FRAGMENTS.map((frag) => ({
      position: new Animated.ValueXY({ x: frag.initialX, y: frag.initialY }),
      rotation: new Animated.Value(frag.rotation),
      scale: new Animated.Value(0.8),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fadeIns = fragmentAnims.map((anim, index) => 
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 1200,
          delay: index * 250,
          useNativeDriver: true,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        })
      ])
    );

    Animated.parallel(fadeIns).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const assemblePuzzle = () => {
    setAssembled(true);
    const assemblyAnimations = fragmentAnims.map((anim, index) => 
      Animated.parallel([
        Animated.spring(anim.position, {
          toValue: { x: width / 2 - 60, y: height / 2 - 140 }, 
          tension: 15,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(assemblyAnimations).start(() => {
      setTimeout(() => navigation.navigate('Home'), 1000);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.background} />

      {/* Fragments Layer */}
      {FRAGMENTS.map((fragment, index) => (
        <Animated.View
          key={fragment.id}
          style={[
            styles.fragment,
            {
              width: fragment.size,
              height: fragment.size,
              opacity: fragmentAnims[index].opacity,
              transform: [
                { translateX: fragmentAnims[index].position.x },
                { translateY: fragmentAnims[index].position.y },
                { rotate: fragmentAnims[index].rotation.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ['-360deg', '360deg']
                  }) 
                },
                { scale: fragmentAnims[index].scale },
                { scale: assembled ? 1 : pulseAnim },
              ],
            },
          ]}
        >
          <View style={[styles.fragmentInner, { backgroundColor: fragment.color }]}>
            <View style={styles.milkyOverlay} />
          </View>
        </Animated.View>
      ))}

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {/* Top Section: Branding */}
          <View style={styles.topSection}>
            <Text style={styles.logoText}>Fragment</Text>
            <View style={styles.logoUnderline} />
          </View>

          {/* Center Section: Tagline (Pushed down slightly) */}
          <View style={styles.midSection}>
            <Text style={styles.tagline}>
              Every connection is a fragment.{'\n'}
              Build your masterpiece.
            </Text>
          </View>

          {/* Bottom Section: Action */}
          <View style={styles.bottomSection}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={assemblePuzzle} 
              style={styles.buttonContainer}
            >
              <View style={styles.button}>
                <Text style={styles.buttonText}>
                  {assembled ? 'Assembling...' : 'Begin Journey'}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.footerNote}>v1.0 • Designed for connection</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFCFB' },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FDFCFB' },
  safeArea: { flex: 1 },
  contentContainer: { 
    flex: 1, 
    paddingHorizontal: 40, 
    justifyContent: 'space-between', // Forces items to top, middle, and bottom
    paddingVertical: 20 
  },
  
  // Top Branding
  topSection: { 
    alignItems: 'center', 
    marginTop: height * 0.05 
  },
  logoText: { 
    fontSize: 34, 
    fontWeight: '300', 
    color: '#1A1A1A', 
    letterSpacing: 6 
  },
  logoUnderline: { 
    width: 30, 
    height: 1.5, 
    backgroundColor: '#1A1A1A', 
    marginTop: 12 
  },

  // Mid Tagline
  midSection: {
    marginTop: height * 0.1, // Positions it below the floating fragments
  },
  tagline: { 
    fontSize: 17, 
    color: '#6B6B6B', 
    textAlign: 'center', 
    lineHeight: 28, 
    fontWeight: '400',
    letterSpacing: 0.2
  },

  // Bottom Action
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10
  },
  buttonContainer: { 
    width: '100%', 
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  button: { 
    backgroundColor: '#1A1A1A', 
    paddingVertical: 20, 
    borderRadius: 14, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#FDFCFB', 
    fontWeight: '600', 
    letterSpacing: 2.5, 
    textTransform: 'uppercase',
    fontSize: 14
  },
  footerNote: {
    marginTop: 24,
    fontSize: 12,
    color: '#A0A0A0',
    letterSpacing: 1
  },

  // Fragment Styling
  fragment: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  fragmentInner: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  milkyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.15)' },
});
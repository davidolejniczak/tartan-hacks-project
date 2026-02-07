import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  // Animation Values
  const moveAnim = useRef(new Animated.Value(0)).current; // 0 = out of frame, 1 = connected
  const glareAnim = useRef(new Animated.Value(0)).current; // Opacity of the flash

  useEffect(() => {
    const startSequence = () => {
      // Reset values
      moveAnim.setValue(0);
      glareAnim.setValue(0);

      Animated.sequence([
        // 1. Pieces Fly In
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
        // 2. The Impact Glare (Flash)
        Animated.sequence([
          Animated.timing(glareAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(glareAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        // 3. Pause for drama
        Animated.delay(1000),
        // 4. Pieces Fly Out
        Animated.timing(moveAnim, {
          toValue: 2, // 2 = fly out past original positions
          duration: 1200,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]).start(() => startSequence()); // Loop the whole thing
    };

    startSequence();
  }, []);

  // Interpolations for Piece 1 (Top)
  const topPieceY = moveAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [-height / 2, -40, -height / 2], // Starts off-top, meets at center-ish, flies back
  });

  // Interpolations for Piece 2 (Bottom)
  const bottomPieceY = moveAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [height / 2, 40, height / 2], // Starts off-bottom, meets at center-ish, flies back
  });

  const renderPiece = (translateY, isTop) => (
    <Animated.View style={[styles.pieceWrapper, { transform: [{ translateY }] }]}>
      <LinearGradient
        colors={['#FFFFFF', '#94A3B8', '#F1F5F9', '#475569']}
        style={[
          styles.chromePiece,
          isTop ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : { borderTopLeftRadius: 0, borderTopRightRadius: 0 }
        ]}
      >
        <View style={styles.glassInner}>
          <LinearGradient colors={['rgba(255,255,255,0.4)', 'transparent']} style={StyleSheet.absoluteFill} />
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F1F5F9', '#DDE4ED']} style={StyleSheet.absoluteFill} />

      {/* Animation Layer */}
      <View style={styles.animationContainer}>
        {renderPiece(topPieceY, true)}
        {renderPiece(bottomPieceY, false)}

        {/* Impact Glare Flare */}
        <Animated.View style={[styles.glareFlash, { opacity: glareAnim }]}>
           <LinearGradient
            colors={['#FFFFFF', 'rgba(255,255,255,0)']}
            style={styles.flareCircle}
          />
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.glassCard}>
          <Text style={styles.title}>Mosaic</Text>
          <Text style={styles.tagline}>
            Connection in motion.{"\n"}Reflect your world.
          </Text>

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => navigation.navigate('Home')}
            style={styles.buttonShadow}
          >
            <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.button}>
              <Text style={styles.buttonText}>Enter The Light</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  animationContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceWrapper: {
    width: 140,
    height: 100,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  chromePiece: {
    flex: 1,
    padding: 2,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassInner: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  glareFlash: {
    position: 'absolute',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flareCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  content: { zIndex: 10, width: '100%', alignItems: 'center' },
  glassCard: {
    width: '85%',
    padding: 40,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1,
    borderColor: '#FFF',
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOpacity: 0.1,
    shadowRadius: 30,
  },
  title: { fontSize: 44, fontWeight: '800', color: '#334155', letterSpacing: -1.5 },
  tagline: { fontSize: 16, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 35 },
  buttonShadow: { width: '100%', borderRadius: 20, elevation: 5 },
  button: { paddingVertical: 18, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  buttonText: { fontSize: 16, fontWeight: '800', color: '#475569' },
});
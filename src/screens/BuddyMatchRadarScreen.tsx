import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, BuddyProfile } from '../types';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import {
  fetchEventBuddyAttendees,
  fetchNearbyBuddyAttendees,
  getConnectionStatus,
  sendConnectionRequest,
  acceptConnectionRequest,
} from '../services/buddyMatchService';
import { ConnectNoteModal } from '../components/ConnectNoteModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BuddyMatchRadar'>;
type RouteProps = RouteProp<RootStackParamList, 'BuddyMatchRadar'>;

interface RadarNode {
  attendee: BuddyProfile;
  angle: number; // degrees
  radius: number; // distance from center in px
  animScale: Animated.Value;
  animOpacity: Animated.Value;
  connectionStatus: 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected';
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RADAR_DIAMETER = Math.min(SCREEN_WIDTH * 0.88, 360);
const RADAR_RADIUS = RADAR_DIAMETER / 2;

export const BuddyMatchRadarScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { allEvents, getEventById } = useEvents();

  const eventId = route.params?.eventId;
  const currentEvent = eventId ? getEventById(eventId) : undefined;

  const [isScanning, setIsScanning] = useState(true);
  const [nodes, setNodes] = useState<RadarNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<RadarNode | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Connect request modal state
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);
  const [targetConnectNode, setTargetConnectNode] = useState<RadarNode | null>(null);
  const [isSendingNote, setIsSendingNote] = useState(false);

  // Animation values
  const sweepRotation = useRef(new Animated.Value(0)).current;
  const pulseRing1 = useRef(new Animated.Value(0.7)).current;
  const pulseRing2 = useRef(new Animated.Value(0.5)).current;
  const centralPulse = useRef(new Animated.Value(1)).current;

  // Start continuous radar sweep and pulsing animations
  useEffect(() => {
    // Rotating sweep beam
    const sweepAnimation = Animated.loop(
      Animated.timing(sweepRotation, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    sweepAnimation.start();

    // Concentric pulse rings
    const ringPulseAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseRing1, {
            toValue: 1.15,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing1, {
            toValue: 0.75,
            duration: 2000,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseRing2, {
            toValue: 1.25,
            duration: 2500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing2, {
            toValue: 0.6,
            duration: 2500,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(centralPulse, {
            toValue: 1.1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(centralPulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    ringPulseAnimation.start();

    return () => {
      sweepAnimation.stop();
      ringPulseAnimation.stop();
    };
  }, []);

  // Fetch attendees and schedule their discovery emergence
  const loadAttendees = async () => {
    setIsScanning(true);
    setSelectedNode(null);
    setDiscoveredCount(0);

    const currentUserId = user?.id || 'usr-alex-001';
    let rawList: BuddyProfile[] = [];

    if (eventId) {
      rawList = await fetchEventBuddyAttendees(eventId, currentUserId);
    } else {
      rawList = await fetchNearbyBuddyAttendees(
        19.076,
        72.8777,
        15,
        user?.interests || ['Workshops', 'Coding', 'Music'],
        currentUserId
      );
    }

    // Distribute attendees on radar circumference/radii
    // Radii distributed from 55px to RADAR_RADIUS - 28px
    const angles = [35, 110, 195, 260, 320, 75, 150, 220];
    const radii = [
      RADAR_RADIUS * 0.42,
      RADAR_RADIUS * 0.72,
      RADAR_RADIUS * 0.55,
      RADAR_RADIUS * 0.85,
      RADAR_RADIUS * 0.65,
      RADAR_RADIUS * 0.78,
    ];

    const radarNodes: RadarNode[] = [];
    for (let i = 0; i < rawList.length; i++) {
      const attendee = rawList[i];
      const status = await getConnectionStatus(currentUserId, attendee.id);

      radarNodes.push({
        attendee,
        angle: angles[i % angles.length],
        radius: radii[i % radii.length],
        animScale: new Animated.Value(0),
        animOpacity: new Animated.Value(0),
        connectionStatus:
          status === 'connected'
            ? 'connected'
            : status === 'pending_outgoing'
            ? 'pending_outgoing'
            : status === 'pending_incoming'
            ? 'pending_incoming'
            : 'none',
      });
    }

    setNodes(radarNodes);

    // Staggered node entrance animation as the sweep reaches them
    radarNodes.forEach((node, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(node.animScale, {
            toValue: 1,
            tension: 50,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(node.animOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();

        setDiscoveredCount((prev) => prev + 1);

        // Auto select first match once discovered
        if (index === 0) {
          setSelectedNode(node);
        }
      }, 500 + index * 420);
    });

    setTimeout(() => {
      setIsScanning(false);
    }, 500 + radarNodes.length * 420 + 200);
  };

  useEffect(() => {
    loadAttendees();
  }, [eventId]);

  const spin = sweepRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleOpenConnectModal = (node: RadarNode) => {
    setTargetConnectNode(node);
    setIsConnectModalVisible(true);
  };

  const handleSendConnectWithNote = async (note?: string) => {
    if (!user || !targetConnectNode) return;
    const target = targetConnectNode;
    setIsSendingNote(true);

    const senderProfile: BuddyProfile = {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      interests: user.interests || [],
      attendanceStatus: 'confirmed',
    };

    const res = await sendConnectionRequest(
      user.id,
      target.attendee.id,
      target.attendee,
      senderProfile,
      eventId,
      note
    );

    setIsSendingNote(false);
    setIsConnectModalVisible(false);

    if (res.success) {
      setNodes((prev) =>
        prev.map((n) =>
          n.attendee.id === target.attendee.id
            ? { ...n, connectionStatus: 'pending_outgoing' }
            : n
        )
      );
      if (selectedNode?.attendee.id === target.attendee.id) {
        setSelectedNode({ ...target, connectionStatus: 'pending_outgoing' });
      }
    } else {
      Alert.alert('Notice', res.error || 'Failed to send connection request.');
    }
  };

  const handleAccept = async (node: RadarNode) => {
    if (!user) return;
    setConnectingId(node.attendee.id);
    const res = await acceptConnectionRequest(node.attendee.id, user.id);
    setConnectingId(null);

    if (res.success) {
      setNodes((prev) =>
        prev.map((n) =>
          n.attendee.id === node.attendee.id
            ? { ...n, connectionStatus: 'connected' }
            : n
        )
      );
      if (selectedNode?.attendee.id === node.attendee.id) {
        setSelectedNode({ ...node, connectionStatus: 'connected' });
      }
    } else {
      Alert.alert('Notice', res.error || 'Failed to accept connection request.');
    }
  };

  const handleOpenChat = (node: RadarNode) => {
    if (node.connectionStatus !== 'connected') {
      Alert.alert('Private Messaging Locked', 'You can only message buddies after connection is accepted.');
      return;
    }
    navigation.navigate('Chat', {
      recipientId: node.attendee.id,
      recipientName: node.attendee.name,
      recipientAvatar: node.attendee.avatarUrl,
      eventId,
    });
  };

  const handleViewAll = () => {
    navigation.navigate('BuddyMatch', { eventId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.headerBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.headerBadgeText}>
                {isScanning ? 'RADAR SCANNING' : 'RADAR ACTIVE'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>
              {currentEvent ? currentEvent.title : 'Hyperlocal Buddy Radar'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={loadAttendees}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isScanning ? 'sync' : 'reload'}
              size={20}
              color={colors.orangePrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Event Context Pill if triggered from Event */}
        {currentEvent && (
          <View style={styles.eventContextBanner}>
            <Ionicons name="location" size={14} color={colors.orangePrimary} />
            <Text style={styles.eventContextText} numberOfLines={1}>
              {currentEvent.venue} • {currentEvent.displayDate}
            </Text>
          </View>
        )}

        {/* Center Radar Area */}
        <View style={styles.radarViewport}>
          {/* Pulsing Concentric Outer Rings */}
          <Animated.View
            style={[
              styles.radarRing,
              {
                width: RADAR_DIAMETER * 1.08,
                height: RADAR_DIAMETER * 1.08,
                borderRadius: (RADAR_DIAMETER * 1.08) / 2,
                transform: [{ scale: pulseRing2 }],
                opacity: 0.18,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              {
                width: RADAR_DIAMETER,
                height: RADAR_DIAMETER,
                borderRadius: RADAR_RADIUS,
                transform: [{ scale: pulseRing1 }],
                opacity: 0.35,
              },
            ]}
          />
          <View
            style={[
              styles.radarRing,
              {
                width: RADAR_DIAMETER * 0.72,
                height: RADAR_DIAMETER * 0.72,
                borderRadius: (RADAR_DIAMETER * 0.72) / 2,
                opacity: 0.45,
              },
            ]}
          />
          <View
            style={[
              styles.radarRing,
              {
                width: RADAR_DIAMETER * 0.42,
                height: RADAR_DIAMETER * 0.42,
                borderRadius: (RADAR_DIAMETER * 0.42) / 2,
                opacity: 0.6,
              },
            ]}
          />

          {/* Crosshairs */}
          <View style={[styles.crosshair, styles.crosshairH]} />
          <View style={[styles.crosshair, styles.crosshairV]} />

          {/* Sweeping Scanner Beam */}
          <Animated.View
            style={[
              styles.sweepContainer,
              {
                width: RADAR_DIAMETER,
                height: RADAR_DIAMETER,
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={styles.sweepBeamWedge} />
          </Animated.View>

          {/* Center User Avatar */}
          <Animated.View
            style={[
              styles.centerUserNode,
              {
                transform: [{ scale: centralPulse }],
              },
            ]}
          >
            <Image
              source={{
                uri:
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              }}
              style={styles.centerAvatarImage}
            />
            <View style={styles.centerBeaconGlow} />
            <View style={styles.centerPulseBadge}>
              <Text style={styles.centerPulseBadgeText}>YOU</Text>
            </View>
          </Animated.View>

          {/* Orbiting / Discovered Attendee Nodes */}
          {nodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = Math.cos(rad) * node.radius;
            const y = Math.sin(rad) * node.radius;
            const isSelected = selectedNode?.attendee.id === node.attendee.id;

            return (
              <Animated.View
                key={node.attendee.id}
                style={[
                  styles.nodeWrapper,
                  {
                    transform: [
                      { translateX: x },
                      { translateY: y },
                      { scale: node.animScale },
                    ],
                    opacity: node.animOpacity,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.nodeCircle,
                    isSelected && styles.nodeCircleSelected,
                    node.connectionStatus === 'connected' && styles.nodeCircleConnected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedNode(node)}
                >
                  <Image
                    source={{ uri: node.attendee.avatarUrl }}
                    style={styles.nodeAvatarImage}
                  />
                  {node.connectionStatus === 'connected' && (
                    <View style={styles.nodeConnectedBadge}>
                      <Ionicons name="chatbubble" size={9} color="#fff" />
                    </View>
                  )}
                  {node.connectionStatus === 'pending_outgoing' && (
                    <View style={styles.nodePendingBadge}>
                      <Ionicons name="time" size={9} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.nodeNameTag}>
                  <Text style={styles.nodeNameText} numberOfLines={1}>
                    {node.attendee.name.split(' ')[0]}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Radar Metric & Search Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>
            {isScanning
              ? 'Scanning nearby attendees & event circles...'
              : `${discoveredCount} Buddies Discovered on Radar`}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isScanning
              ? 'Locating verified participants with matching interests'
              : 'Tap any buddy node to preview and start a conversation'}
          </Text>
        </View>

        {/* Selected Buddy Preview Card */}
        {selectedNode && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Image
                source={{ uri: selectedNode.attendee.avatarUrl }}
                style={styles.previewAvatar}
              />
              <View style={styles.previewInfo}>
                <View style={styles.previewTitleRow}>
                  <Text style={styles.previewName}>{selectedNode.attendee.name}</Text>
                  {selectedNode.connectionStatus === 'connected' && (
                    <View style={styles.connectedPill}>
                      <Text style={styles.connectedPillText}>Connected</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.previewBio} numberOfLines={2}>
                  {selectedNode.attendee.bio || 'Exploring local community events & workshops.'}
                </Text>

                {/* Shared Interest Chips */}
                <View style={styles.previewInterestsRow}>
                  {selectedNode.attendee.interests.slice(0, 3).map((tag) => (
                    <View key={tag} style={styles.interestTag}>
                      <Text style={styles.interestTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.previewActionsRow}>
              {selectedNode.connectionStatus === 'connected' ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnMessage]}
                  onPress={() => handleOpenChat(selectedNode)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubbles" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnMessageText}>Message</Text>
                </TouchableOpacity>
              ) : selectedNode.connectionStatus === 'pending_outgoing' ? (
                <View style={styles.pendingCardCol}>
                  <View style={[styles.actionBtn, styles.actionBtnPending]}>
                    <Ionicons name="time" size={15} color={colors.amberPrimary} style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnPendingText}>Request Sent</Text>
                  </View>
                  <Text style={styles.radarWaitingText}>Waiting for them to accept</Text>
                </View>
              ) : selectedNode.connectionStatus === 'pending_incoming' ? (
                <View style={styles.pendingCardCol}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnAccept]}
                    onPress={() => handleAccept(selectedNode)}
                    disabled={connectingId === selectedNode.attendee.id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#07080B" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnAcceptText}>
                      {connectingId === selectedNode.attendee.id ? 'Accepting...' : 'Accept Request'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.radarIncomingText}>Sent you a connection request</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={() => handleOpenConnectModal(selectedNode)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={16} color="#07080B" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnPrimaryText}>Connect</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSecondary]}
                onPress={handleViewAll}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnSecondaryText}>View Roster</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Full Directory Action */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.fullDirectoryBtn}
            onPress={handleViewAll}
            activeOpacity={0.85}
          >
            <Ionicons name="people" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.fullDirectoryBtnText}>
              View All Discovered People ({discoveredCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Connect Request with Optional Note Modal */}
        <ConnectNoteModal
          visible={isConnectModalVisible}
          targetUser={targetConnectNode ? targetConnectNode.attendee : null}
          onClose={() => setIsConnectModalVisible(false)}
          onSend={handleSendConnectWithNote}
          isSending={isSendingNote}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: spacing.sm,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    marginBottom: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orangePrimary,
    marginRight: 6,
  },
  headerBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.orangePrimary,
    letterSpacing: 0.8,
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  eventContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  eventContextText: {
    ...typography.caption,
    color: colors.orangeLight,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  radarViewport: {
    width: SCREEN_WIDTH,
    height: RADAR_DIAMETER * 1.08,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.xs,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    backgroundColor: 'transparent',
  },
  crosshair: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  crosshairH: {
    width: RADAR_DIAMETER * 0.95,
    height: 1,
  },
  crosshairV: {
    width: 1,
    height: RADAR_DIAMETER * 0.95,
  },
  sweepContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweepBeamWedge: {
    position: 'absolute',
    top: 0,
    left: RADAR_RADIUS - 1,
    width: 2,
    height: RADAR_RADIUS,
    backgroundColor: 'rgba(0, 240, 255, 0.85)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  centerUserNode: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  centerBeaconGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.4)',
  },
  centerPulseBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.pill,
  },
  centerPulseBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  nodeWrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 20,
  },
  nodeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: '#1E2333',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  nodeCircleSelected: {
    borderColor: '#00F0FF',
    borderWidth: 2.5,
    shadowColor: '#00F0FF',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    transform: [{ scale: 1.15 }],
  },
  nodeCircleConnected: {
    borderColor: '#10B981',
  },
  nodeAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  nodeConnectedBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0B0D17',
  },
  nodePendingBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0B0D17',
  },
  nodeNameTag: {
    backgroundColor: 'rgba(11, 13, 23, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.pill,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  nodeNameText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  statusTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statusSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: '#161926',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  previewHeader: {
    flexDirection: 'row',
  },
  previewAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewName: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  connectedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  connectedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  previewBio: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  previewInterestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  interestTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: colors.orangePrimary,
  },
  actionBtnPrimaryText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#07080B',
  },
  actionBtnMessage: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  actionBtnMessageText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#fff',
  },
  actionBtnAccept: {
    backgroundColor: colors.orangePrimary,
  },
  actionBtnAcceptText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#07080B',
  },
  pendingCardCol: {
    flex: 1,
    alignItems: 'center',
  },
  radarWaitingText: {
    fontSize: 10,
    color: colors.amberLight,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  radarIncomingText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  actionBtnPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    width: '100%',
  },
  actionBtnPendingText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.amberLight,
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionBtnSecondaryText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'android' ? 16 : 8,
  },
  fullDirectoryBtn: {
    backgroundColor: '#1E2333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    height: 48,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullDirectoryBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});

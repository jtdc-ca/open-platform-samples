/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
  Button,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import Auth0 from 'react-native-auth0';
import Axios from 'axios';

const AUTH0_HOST = 'bowdometer.us.auth0.com';
const AUTH0_CLIENT_ID = '9bdQno729MPCBkQw1bQ2i0Wje8AGD9ci'; // Test application
const BOP_HOST = 'localhost:18080';

interface BowdometerDevice {
  id: string;
  name: string;
}

interface BowdometerActiveSession {
  status: string;
  sessionNumber: number;
  sessionShotCount: number;
  sessionShotCountTarget: number;
  sessionXiAverage: number;
  lastShotXi?: number;
  lastShotTime?: Date;
  lastShotAngles?: [number, number, number];
}

type GetDevicesResponse = {
  id: string;
  name: string;
  status: 'Connected' | 'Disconnected';
  reason: string;
  lastConnected: boolean;
  bleInfo?: {
    name: string;
    mfgName: string;
    modelNumber: string;
    serialNumber: string;
    firmwareRev: string;
    hardwareRev: string;
    rssi: number;
    battery: number;
  };
}[];

type GetCurrentSessionResponse = {
  status: 'active' | 'paused' | 'ended';
  session: {
    id: string;
    mode: 'Classic' | 'Level';
    duration: number;
    time: number;
    number: number;
    targetShotCount: number;
    shotCount: number;
    xiAvg: number;
    xiHigh: number;
    xiLow: number;
    xiSpread: number;
    xiLevel: number;
    deviceID: string;
    notes: string;
    isSynced: boolean;
  };
  shots: [
    {
      shotAvg: number;
      shotHigh: number;
      shotLow: number;
      shotNumber: number;
      shotLevel: number;
      shotTime: number;
      shotXi: number;
      angles: [number, number, number];
      isSynced: false;
    },
  ];
};

const auth0Client = new Auth0({
  domain: AUTH0_HOST,
  clientId: AUTH0_CLIENT_ID,
});

const Section: React.FC<{
  title: string;
}> = ({children, title}) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [idToken, setIDToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [accessTokenExpiryDate, setAccessTokenExpiryDate] =
    useState<Date | null>(null);

  const [activeDevice, setActiveDevice] = useState<BowdometerDevice | null>(
    null,
  );
  const [activeSessionInfo, setActiveSessionInfo] =
    useState<BowdometerActiveSession | null>(null);

  const logUserIn = async () => {
    try {
      const creds = await auth0Client.webAuth.authorize({
        audience: 'https://bowdometer.com/api/',
        scope:
          'offline_access openid profile read:devices read:sessions read:shots',
      });

      setIDToken(creds.idToken);
      setAccessToken(creds.accessToken);
      setRefreshToken(creds.refreshToken ?? null);
      setAccessTokenExpiryDate(new Date(Date.now() + creds.expiresIn * 1000));
      setIsLoggedIn(true);
    } catch (err) {
      Alert.alert('Could not log in', err, [{text: 'OK'}]);
    }
  };

  const logUserOut = async () => {
    try {
      await auth0Client.webAuth.clearSession();

      setIsLoggedIn(false);
      setIDToken(null);
      setAccessToken(null);
      setRefreshToken(null);
      setAccessTokenExpiryDate(null);
    } catch (err) {
      Alert.alert('Log out cancelled', err, [{text: 'OK'}]);
    }
  };

  const checkBowdometerAPIStatus = async () => {
    try {
      await Axios.get(`http://${BOP_HOST}/`);
      return true;
    } catch (err) {
      Alert.alert(
        'Could not reach BOWdometer app',
        'Is the background service running?',
      );
    }
    return false;
  };

  const getActiveDevice = async (
    userAccessToken: string,
  ): Promise<BowdometerDevice | null> => {
    try {
      const devicesResponse = await Axios.get<GetDevicesResponse>(
        `http://${BOP_HOST}/bluetooth/devices`,
        {headers: {Authorization: `Bearer ${userAccessToken}`}},
      );

      const device = devicesResponse.data.find(d => d.status === 'Connected');

      if (device !== undefined) {
        return {
          id: device.id,
          name: device.name,
        };
      }
    } catch (err) {
      console.error('Could not get active device:', err);
    }

    return null;
  };

  const getActiveSession = async (
    userAccessToken: string,
    deviceID: string,
  ) => {
    try {
      const activeSessionRes = await Axios.get<GetCurrentSessionResponse>(
        `http://${BOP_HOST}/devices/${deviceID}/currentSession`,
        {
          headers: {Authorization: `Bearer ${userAccessToken}`},
          validateStatus: status => [200, 404].includes(status),
        },
      );

      if (activeSessionRes.status === 404) {
        console.log('No active session exists');
        return null;
      }

      const activeSession = activeSessionRes.data;
      const lastShot =
        activeSession.shots.length > 0 ? activeSession.shots[0] : null;

      const sessionInfo: BowdometerActiveSession = {
        status: activeSession.status,
        sessionNumber: activeSession.session.number,
        sessionShotCount: activeSession.session.shotCount,
        sessionShotCountTarget: activeSession.session.targetShotCount,
        sessionXiAverage: activeSession.session.xiAvg,
        lastShotXi: lastShot?.shotXi ?? undefined,
        lastShotTime:
          lastShot !== null ? new Date(lastShot.shotTime * 1000) : undefined,
        lastShotAngles: lastShot?.angles ?? undefined,
      };

      return sessionInfo;
    } catch (err) {
      console.error('Could not get active session:', err);
    }

    return null;
  };

  const refreshSessionInformation = async (userAccessToken: string) => {
    const apiIsHealthy = await checkBowdometerAPIStatus();
    if (!apiIsHealthy) {
      return;
    }

    console.info('Refreshing session info...');

    const device = await getActiveDevice(userAccessToken);
    setActiveDevice(device);

    if (device !== null) {
      const activeSession = await getActiveSession(userAccessToken, device.id);
      setActiveSessionInfo(activeSession);
    } else {
      setActiveSessionInfo(null);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshSessionInformation(accessToken!);
    }
  }, [isLoggedIn]);

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={[
            styles.sectionContainer,
            {backgroundColor: isDarkMode ? Colors.black : Colors.white},
          ]}>
          {!isLoggedIn ? (
            <Section title="Authorization">
              <View>
                <Text>
                  Click{' '}
                  <Text style={styles.linkText} onPress={logUserIn}>
                    here
                  </Text>{' '}
                  to authorize this app and login.
                </Text>
              </View>
            </Section>
          ) : (
            <>
              <Section title="Logged in!">
                <View>
                  <Text>
                    Token expires: {accessTokenExpiryDate!.toLocaleString()}
                  </Text>
                </View>
                <View>
                  <Text>
                    Click{' '}
                    <Text style={styles.linkText} onPress={logUserOut}>
                      here
                    </Text>{' '}
                    to log out.
                  </Text>
                </View>
              </Section>
              <Section title="Session information">
                <View style={{flexDirection: 'column'}}>
                  <View>
                    <Button
                      title="Refresh"
                      onPress={async () =>
                        refreshSessionInformation(accessToken!)
                      }
                    />
                  </View>
                  <View style={{marginTop: 15}}>
                    <Text>
                      Active BOWdometer:{' '}
                      {activeDevice !== null ? activeDevice.name : 'none'}
                    </Text>
                  </View>
                  <View style={{marginTop: 15}}>
                    <Text>
                      Active session:{' '}
                      {activeSessionInfo === null
                        ? 'none'
                        : `#${activeSessionInfo.sessionNumber}`}
                    </Text>
                  </View>
                  {activeSessionInfo !== null && (
                    <View>
                      <Text>* Status: {activeSessionInfo.status}</Text>
                      <Text>
                        * Shots taken: {activeSessionInfo.sessionShotCount}
                        {activeSessionInfo.sessionShotCountTarget > 0
                          ? ` / ${activeSessionInfo.sessionShotCountTarget}`
                          : ' (no target set)'}
                      </Text>
                      <Text>
                        * Last shot Xi:{' '}
                        {activeSessionInfo.lastShotXi !== undefined
                          ? `${activeSessionInfo.lastShotXi.toFixed(
                              5,
                            )} (average: ${activeSessionInfo.sessionXiAverage.toFixed(
                              5,
                            )})`
                          : 'no shots taken'}
                      </Text>
                      <Text>
                        * Last shot time:{' '}
                        {activeSessionInfo.lastShotTime?.toTimeString() ??
                          'no shots taken'}
                      </Text>
                      <Text>
                        * Last shot angles:{' '}
                        {activeSessionInfo.lastShotAngles !== undefined
                          ? activeSessionInfo.lastShotAngles
                              .map(
                                angle =>
                                  `${((angle * 180) / Math.PI).toFixed(3)}°`,
                              )
                              .join(', ')
                          : 'none yet'}
                      </Text>
                    </View>
                  )}
                </View>
              </Section>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  linkText: {
    color: 'rgb(220, 0, 78)',
    textDecorationLine: 'underline',
  },
});

export default App;

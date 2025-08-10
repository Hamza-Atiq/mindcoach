// mindcoach/app/App.js
import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, Button, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScrollView } from 'react-native';

const Stack = createNativeStackNavigator();

// Load local sessions bundled with the app
const localSessions = require('./assets/sessions.json');
const SERVER_BASE = '<PASTE_YOUR_VERCEL_URL_HERE>/api';

function HomeScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    async function load() {
      // Try remote first (if SERVER_BASE configured)
      if (SERVER_BASE && !SERVER_BASE.includes('<PASTE_YOUR')) {
        try {
          const r = await fetch(`${SERVER_BASE}/sessions`);
          if (r.ok) {
            const remote = await r.json();
            setSessions(remote);
            loadTrend();
            console.log('Loaded sessions from server:', SERVER_BASE);
            return;
          }
        } catch (e) {
          console.warn('Failed to fetch sessions from server, falling back to local', e);
        }
      }
      // fallback to local
      setSessions(localSessions);
      loadTrend();
    }
    load();
  }, []);


  async function loadTrend() {
    try {
      const raw = await AsyncStorage.getItem('mood_logs');
      const arr = raw ? JSON.parse(raw) : [];
      setTrend(arr.slice(-7).reverse());
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <SafeAreaView style={{flex:1, padding:16}}>
      <Text style={{fontSize:24, fontWeight:'bold', marginBottom:12}}>MindCoach — Sessions</Text>
      <FlatList
        data={sessions}
        keyExtractor={(i) => i.id}
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Session', { sessionId: item.id })}
            style={{padding:16, borderWidth:1, borderColor:'#ddd', borderRadius:8, marginBottom:10}}
          >
            <Text style={{fontSize:18}}>{item.title}</Text>
            <Text style={{color:'#666'}}>{Math.round(item.duration_seconds/60)} min</Text>
          </TouchableOpacity>
        )}
      />

      <View style={{marginTop:20}}>
        <Text style={{fontSize:18}}>Recent mood logs</Text>
        {trend.length === 0 ? <Text style={{color:'#666'}}>No logs yet</Text> :
          trend.map((t,i)=> <Text key={i}>{new Date(t.ts).toLocaleString()}: {t.mood}</Text>)
        }
        <View style={{marginTop:12}}>
          <Button title="Refresh logs" onPress={loadTrend}/>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SessionScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const s = localSessions.find(ss => ss.id === sessionId);
    if (s) setSession(s);
  }, [sessionId]);

  useEffect(() => {
    // cleanup: stop speech when leaving
    return () => {
      runningRef.current = false;
      Speech.stop();
    };
  }, []);

  // Safe speak: only speak strings, with logging for debugging
  function speakScript(text) {
    return new Promise((resolve, reject) => {
      if (typeof text !== 'string' || text.trim().length === 0) {
        const msg = 'TTS refused: invalid text';
        console.warn(msg, text);
        return reject(new Error(msg));
      }
      // Log first 200 chars so we can see what's being spoken
      console.log('TTS speaking chunk (start):', text.slice(0, 200));
      const options = {
        onDone: () => {
          console.log('TTS onDone for chunk');
          resolve();
        },
        onStopped: () => {
          console.log('TTS onStopped for chunk');
          resolve();
        },
        onError: (err) => {
          console.warn('TTS onError', err);
          reject(err);
        }
      };
      try {
        Speech.speak(text, options);
      } catch (err) {
        console.warn('Speech.speak threw', err);
        reject(err);
      }
    });
  }

  async function startGuided() {
    console.log('startGuided called. session value:', session);
    if (!session) {
      Alert.alert('Error', 'Session not loaded yet.');
      return;
    }

    // If there's any currently playing speech, stop it first to avoid interruptions
    try {
      Speech.stop();
    } catch (e) {
      console.warn('Speech.stop() error at session start', e);
    }

    // After stopping any previous TTS, set running
    setRunning(true);
    runningRef.current = true;
    setStatus('preparing');

    // debug: show type/value of session.script
    console.log('typeof session.script =', typeof session.script);
    if (typeof session.script === 'string') {
      console.log('session.script preview:', session.script.slice(0, 300));
    } else {
      console.log('session.script is NOT a string; value =', session.script);
    }

    if (typeof session.script !== 'string' || session.script.trim().length === 0) {
      Alert.alert('Error', 'Session script missing or invalid. See Metro logs for details.');
      console.warn('Aborting startGuided: invalid session.script', session && session.script);
      return;
    }

    setRunning(true);
    runningRef.current = true;
    setStatus('preparing');

    try {
      // Try to split on empty lines. If that produces zero chunks, fallback to entire script.
      let chunks = session.script
        .split(/\r?\n\s*\r?\n/)
        .map(s => s.replace(/\r?\n/g, ' ').trim())
        .filter(Boolean);

      if (!chunks || chunks.length === 0) {
        console.log('Splitter produced 0 chunks — falling back to full script.');
        chunks = [session.script.replace(/\r?\n/g, ' ').trim()];
      }

      console.log('startGuided: created chunks count =', chunks.length);

      setStatus('speaking');
      for (let i = 0; i < chunks.length; i++) {
        if (!runningRef.current) {
          console.log('startGuided: stopped by user (runningRef false)');
          break;
        }
        setStatus(`speaking (${i+1}/${chunks.length})`);
        const chunk = chunks[i];
        if (typeof chunk !== 'string' || chunk.length === 0) continue;
        await speakScript(chunk);
        // small pause
        await new Promise(r => setTimeout(r, 400));
      }

      setStatus('completed');
    } catch (e) {
      console.warn('TTS error (caught):', e);
      Alert.alert('TTS error', e.message || String(e));
    } finally {
      setRunning(false);
      runningRef.current = false;
      // after session, prompt mood
      promptMood();
    }
  }

  async function stopGuided() {
    runningRef.current = false;
    setRunning(false);
    setStatus('stopped');
    try {
      Speech.stop();
    } catch (e) {
      console.warn('Speech.stop error', e);
    }
    // Prompt mood after stopping
    promptMood();
  }

  async function testTTS() {
    if (runningRef.current) {
      Alert.alert('Busy', 'A session is running. Stop it before testing TTS.');
      return;
    }
    
    // quick test to confirm device TTS works
    try {
      console.log('Test TTS: speaking "Hello, this is a test."');
      await speakScript('Hello, this is a quick test. Please check your device volume.');
      Alert.alert('TTS test finished');
    } catch (e) {
      console.warn('TTS test failed', e);
      Alert.alert('TTS test failed', String(e));
    }
  }

  async function promptMood(){
    const mood = await new Promise((resolve) => {
      Alert.alert(
        'How do you feel now?',
        '',
        [
          { text: 'Calmer', onPress: () => resolve('Calmer') },
          { text: 'Same', onPress: () => resolve('Same') },
          { text: 'Worse', onPress: () => resolve('Worse') },
        ],
        { cancelable: true }
      );
    });
    if (!mood) return;
    const log = { mood, ts: new Date().toISOString() };
    try {
      const raw = await AsyncStorage.getItem('mood_logs');
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(log);
      await AsyncStorage.setItem('mood_logs', JSON.stringify(arr));
      Alert.alert('Saved', `Logged: ${mood}`);
    } catch (e) {
      console.warn(e);
    }
  }

  if (!session) return <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator/></SafeAreaView>;

  return (
    <SafeAreaView style={{flex:1, padding:16}}>
      <Text style={{fontSize:22, fontWeight:'bold'}}>{session.title}</Text>
      <Text style={{marginVertical:8,color:'#666'}}>{status}</Text>

      <View style={{flex:1, marginTop:12}}>
        <Text style={{fontSize:16, marginBottom:8}}>Script preview</Text>
        {/* Scrollable preview */}
        <View style={{padding:12, borderWidth:1, borderColor:'#ddd', borderRadius:8, flex:1}}>
          <ScrollView>
            <Text style={{lineHeight:20}}>{session.script}</Text>
          </ScrollView>
        </View>
      </View>

      <View style={{marginVertical:12}}>
        <Button title="Test TTS (quick)" onPress={testTTS} disabled={running}/>
      </View>

      <View style={{marginVertical:12}}>
        {!running ? (
          <Button title="Start guided session (voice)" onPress={startGuided} disabled={running}/>
        ) : (
          <Button title="Stop session" color="red" onPress={stopGuided}/>
        )}
      </View>
      <View style={{marginBottom:20}}>
        <Button
          title="Back"
          onPress={() => {
            if (runningRef.current) {
              Alert.alert('Session running', 'Stop the session first before leaving.', [{ text: 'OK' }]);
              return;
            }
            navigation.goBack();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{headerShown:false}}/>
        <Stack.Screen name="Session" component={SessionScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

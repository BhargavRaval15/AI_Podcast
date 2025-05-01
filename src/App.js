import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Card,
  Grid,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Divider,
  Fade,
  Grow
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import MicIcon from '@mui/icons-material/Mic';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import PersonIcon from '@mui/icons-material/Person';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import GroupsIcon from '@mui/icons-material/Groups';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import axios from 'axios';
import { Buffer } from 'buffer';

// Background pattern SVG as base64
const patternSvg = `data:image/svg+xml;base64,${btoa(`
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path fill="none" stroke="rgba(120, 130, 255, 0.12)" stroke-width="1" d="M10,10 L90,90"/>
  <circle cx="50" cy="50" r="3" fill="rgba(120, 130, 255, 0.08)"/>
  <circle cx="15" cy="15" r="1.5" fill="rgba(120, 130, 255, 0.06)"/>
  <circle cx="85" cy="85" r="1.5" fill="rgba(120, 130, 255, 0.06)"/>
  <circle cx="15" cy="85" r="1.5" fill="rgba(120, 130, 255, 0.06)"/>
  <circle cx="85" cy="15" r="1.5" fill="rgba(120, 130, 255, 0.06)"/>
</svg>
`)}`;

function App() {
  const theme = useTheme();
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [scriptParts, setScriptParts] = useState({ narrator: '', host: '', guest: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState({ narrator: false, host: false, guest: false });
  const [voices, setVoices] = useState([]);
  
  // Voice selection for different speakers
  const [narratorVoice, setNarratorVoice] = useState('');
  const [hostVoice, setHostVoice] = useState('');
  const [guestVoice, setGuestVoice] = useState('');
  
  // Audio URLs for different speakers
  const [audioUrls, setAudioUrls] = useState({ narrator: '', host: '', guest: '' });
  
  // Audio refs for different speakers
  const narratorAudioRef = useRef(null);
  const hostAudioRef = useRef(null);
  const guestAudioRef = useRef(null);
  
  // Tab state for script display
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    // Fetch available voices
    const fetchVoices = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/voices');
        console.log('Voices received from API:', response.data);
        
        if (response.data.voices) {
          setVoices(response.data.voices);
          
          if (response.data.voices.length > 0) {
            // Set different default voices if available
            setNarratorVoice(response.data.voices[0].voice_id);
            
            if (response.data.voices.length > 1) {
              setHostVoice(response.data.voices[1].voice_id);
            } else {
              setHostVoice(response.data.voices[0].voice_id);
            }
            
            if (response.data.voices.length > 2) {
              setGuestVoice(response.data.voices[2].voice_id);
            } else {
              setGuestVoice(response.data.voices[0].voice_id);
            }
            
            console.log('Set default voices:', {
              narrator: response.data.voices[0].voice_id,
              host: response.data.voices.length > 1 ? response.data.voices[1].voice_id : response.data.voices[0].voice_id,
              guest: response.data.voices.length > 2 ? response.data.voices[2].voice_id : response.data.voices[0].voice_id
            });
          } else {
            console.warn('No voices found in API response');
          }
        } else {
          console.error('Invalid response format from voices API:', response.data);
        }
      } catch (err) {
        console.error('Error fetching voices:', err);
      }
    };
    
    fetchVoices();
  }, []);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      setScript('');
      setScriptParts({ narrator: '', host: '', guest: '' });
      setAudioUrls({ narrator: '', host: '', guest: '' });
      setIsPlaying({ narrator: false, host: false, guest: false });
      
      if (!topic.trim()) {
        setError('Please enter a topic');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/generate-podcast', { 
        topic,
        narratorVoiceId: narratorVoice,
        hostVoiceId: hostVoice,
        guestVoiceId: guestVoice
      });
      
      setScript(response.data.script);
      
      if (response.data.scriptParts) {
        setScriptParts(response.data.scriptParts);
      }
      
      // Handle audio generation or error
      if (response.data.audioError) {
        // Audio failed but we still have a script
        setError(response.data.audioError + '. Script generated successfully.');
      } else if (response.data.audio) {
        try {
          const newAudioUrls = {};
          
          // Process narrator audio
          if (response.data.audio.narrator) {
            const narratorBlob = new Blob([Buffer.from(response.data.audio.narrator, 'base64')], { type: 'audio/mpeg' });
            newAudioUrls.narrator = URL.createObjectURL(narratorBlob);
          }
          
          // Process host audio
          if (response.data.audio.host) {
            const hostBlob = new Blob([Buffer.from(response.data.audio.host, 'base64')], { type: 'audio/mpeg' });
            newAudioUrls.host = URL.createObjectURL(hostBlob);
          }
          
          // Process guest audio
          if (response.data.audio.guest) {
            const guestBlob = new Blob([Buffer.from(response.data.audio.guest, 'base64')], { type: 'audio/mpeg' });
            newAudioUrls.guest = URL.createObjectURL(guestBlob);
          }
          
          setAudioUrls(newAudioUrls);
        } catch (audioErr) {
          console.error('Error processing audio:', audioErr);
          setError('Audio could not be processed. Script generated successfully.');
        }
      } else {
        setError('Unknown response format. Script generated successfully.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.details || err.message || 'Failed to generate podcast script. Please try again.';
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handlePlayPause = (speaker) => {
    const audioRef = 
      speaker === 'narrator' ? narratorAudioRef.current :
      speaker === 'host' ? hostAudioRef.current :
      speaker === 'guest' ? guestAudioRef.current : null;
    
    if (audioRef) {
      if (isPlaying[speaker]) {
        audioRef.pause();
      } else {
        // Pause all other audio first
        if (narratorAudioRef.current && speaker !== 'narrator') narratorAudioRef.current.pause();
        if (hostAudioRef.current && speaker !== 'host') hostAudioRef.current.pause();
        if (guestAudioRef.current && speaker !== 'guest') guestAudioRef.current.pause();
        
        // Update all playing states
        setIsPlaying(prev => ({
          narrator: speaker === 'narrator' ? true : false,
          host: speaker === 'host' ? true : false,
          guest: speaker === 'guest' ? true : false
        }));
        
        audioRef.play();
      }
    }
  };
  
  const handleAudioEnded = (speaker) => {
    setIsPlaying(prev => ({
      ...prev,
      [speaker]: false
    }));
  };
  
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Add play all functionality
  const handlePlayAll = async () => {
    // First pause any currently playing audio
    if (narratorAudioRef.current) narratorAudioRef.current.pause();
    if (hostAudioRef.current) hostAudioRef.current.pause();
    if (guestAudioRef.current) guestAudioRef.current.pause();
    
    // Reset playing states
    setIsPlaying({
      narrator: false,
      host: false,
      guest: false
    });
    
    // Play narrator first if available
    if (narratorAudioRef.current && audioUrls.narrator) {
      setIsPlaying(prev => ({ ...prev, narrator: true }));
      narratorAudioRef.current.play();
      
      // Wait for narrator to finish
      await new Promise(resolve => {
        narratorAudioRef.current.onended = resolve;
      });
      
      setIsPlaying(prev => ({ ...prev, narrator: false }));
    }
    
    // Then play host if available
    if (hostAudioRef.current && audioUrls.host) {
      setIsPlaying(prev => ({ ...prev, host: true }));
      hostAudioRef.current.play();
      
      // Wait for host to finish
      await new Promise(resolve => {
        hostAudioRef.current.onended = resolve;
      });
      
      setIsPlaying(prev => ({ ...prev, host: false }));
    }
    
    // Finally play guest if available
    if (guestAudioRef.current && audioUrls.guest) {
      setIsPlaying(prev => ({ ...prev, guest: true }));
      guestAudioRef.current.play();
      
      // Wait for guest to finish
      await new Promise(resolve => {
        guestAudioRef.current.onended = resolve;
      });
      
      setIsPlaying(prev => ({ ...prev, guest: false }));
    }
  };

  // Add function for sequential playback by sections
  const handlePlayBySection = async () => {
    try {
      // First, pause any currently playing audio
      if (narratorAudioRef.current) narratorAudioRef.current.pause();
      if (hostAudioRef.current) hostAudioRef.current.pause();
      if (guestAudioRef.current) guestAudioRef.current.pause();
      
      // Reset playing states
      setIsPlaying({
        narrator: false,
        host: false,
        guest: false
      });
      
      // Parse the full script into sections by speaker
      const sections = parseScriptIntoSections(script);
      
      // Setting up audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      
      // For each section, we need to:
      // 1. Decode the audio for that speaker
      // 2. Identify the part of the audio to play (based on text match)
      // 3. Play that part
      
      // Function to create a better text match by removing special characters
      const normalizeText = (text) => {
        return text.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();
      };
      
      // Set initial tab to full script
      setCurrentTab(0);
      
      // For tracking our progress
      let currentSectionIndex = 0;
      const totalSections = sections.length;
      
      // Play each section
      for (const section of sections) {
        currentSectionIndex++;
        console.log(`Playing section ${currentSectionIndex}/${totalSections}:`, section);
        
        // Skip sections with no audio
        if (!audioUrls[section.speaker]) {
          console.log(`No audio available for ${section.speaker}, skipping`);
          continue;
        }
        
        // Get the right audio reference
        const audioRef = 
          section.speaker === 'narrator' ? narratorAudioRef.current :
          section.speaker === 'host' ? hostAudioRef.current :
          section.speaker === 'guest' ? guestAudioRef.current : null;
        
        if (audioRef) {
          // Update UI to show which voice is playing
          setIsPlaying(prev => ({
            ...prev,
            [section.speaker]: true
          }));
          
          // Update the currently displayed tab
          setCurrentTab(0); // Full script view
          
          // Play the audio
          audioRef.play();
          
          // Update UI with highlighted section
          // This would ideally highlight the current part being spoken
          
          // Wait for this section to finish
          await new Promise((resolve) => {
            // Set a timeout based on audio duration or estimated time
            // For simplicity, estimate 100ms per character
            const estimatedDuration = Math.min(
              section.text.length * 75, // 75ms per character
              audioRef.duration * 1000 || 10000 // use actual duration if available, or 10s max
            );
            
            console.log(`Estimated duration for section: ${estimatedDuration}ms`);
            
            // Stop after the estimated time
            setTimeout(resolve, estimatedDuration);
          });
          
          // Pause this audio before moving to next section
          audioRef.pause();
          
          // Reset playing state for this speaker
          setIsPlaying(prev => ({
            ...prev,
            [section.speaker]: false
          }));
        }
      }
      
      // All done - reset states
      setIsPlaying({
        narrator: false,
        host: false,
        guest: false
      });
      
      // Return to full script view
      setCurrentTab(0);
    } catch (error) {
      console.error("Error during section playback:", error);
      // Reset states on error
      setIsPlaying({
        narrator: false,
        host: false,
        guest: false
      });
    }
  };

  // Function to parse full script into sections by speaker
  const parseScriptIntoSections = (fullScript) => {
    const sections = [];
    const lines = fullScript.split('\n');
    let currentSpeaker = null;
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (line === '') continue;
      
      // Check for speaker labels
      if (line.match(/^\[NARRATOR\]:/i) || line.match(/^NARRATOR:/i)) {
        // Extract content after the label
        const content = line.replace(/^\[NARRATOR\]:\s*/i, '').replace(/^NARRATOR:\s*/i, '');
        currentSpeaker = 'narrator';
        currentSection = { speaker: 'narrator', text: content };
        sections.push(currentSection);
      } 
      else if (line.match(/^\[HOST\]:/i) || line.match(/^HOST:/i)) {
        const content = line.replace(/^\[HOST\]:\s*/i, '').replace(/^HOST:\s*/i, '');
        currentSpeaker = 'host';
        currentSection = { speaker: 'host', text: content };
        sections.push(currentSection);
      } 
      else if (line.match(/^\[GUEST\]:/i) || line.match(/^GUEST:/i)) {
        const content = line.replace(/^\[GUEST\]:\s*/i, '').replace(/^GUEST:\s*/i, '');
        currentSpeaker = 'guest';
        currentSection = { speaker: 'guest', text: content };
        sections.push(currentSection);
      }
      // If no speaker label but we have a current speaker, add to their section
      else if (currentSpeaker && currentSection) {
        // Add to the text of current section
        currentSection.text += '\n' + line;
      }
      // If there's no speaker label yet but it's not empty, assume narrator
      else if (!currentSpeaker && line) {
        currentSpeaker = 'narrator';
        currentSection = { speaker: 'narrator', text: line };
        sections.push(currentSection);
      }
    }
    
    console.log('Parsed sections:', sections);
    return sections;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        background: `
          linear-gradient(135deg, 
            rgba(10, 12, 25, 1) 0%, 
            rgba(15, 18, 35, 1) 40%,
            rgba(20, 24, 45, 1) 60%,
            rgba(25, 30, 55, 1) 100%
          )
        `,
        py: 4,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${patternSvg})`,
          backgroundRepeat: 'repeat',
          opacity: 0.4,
          zIndex: 0
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '40vw',
          height: '40vw',
          maxWidth: '600px',
          maxHeight: '600px',
          backgroundColor: 'transparent',
          backgroundImage: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0)} 70%)`,
          filter: 'blur(50px)',
          zIndex: 0
        }
      }}
    >
      {/* Floating particles */}
      {[...Array(15)].map((_, index) => (
        <Box
          key={`particle-${index}`}
          component={motion.div}
          sx={{
            position: 'absolute',
            width: index % 3 === 0 ? '12px' : index % 3 === 1 ? '8px' : '6px',
            height: index % 3 === 0 ? '12px' : index % 3 === 1 ? '8px' : '6px',
            borderRadius: '50%',
            background: index % 4 === 0 ? alpha(theme.palette.primary.main, 0.5) :
                       index % 4 === 1 ? alpha(theme.palette.secondary.main, 0.5) :
                       index % 4 === 2 ? alpha(theme.palette.info.main, 0.5) :
                       alpha(theme.palette.success.main, 0.5),
            boxShadow: index % 4 === 0 ? `0 0 15px ${alpha(theme.palette.primary.main, 0.7)}` :
                       index % 4 === 1 ? `0 0 15px ${alpha(theme.palette.secondary.main, 0.7)}` :
                       index % 4 === 2 ? `0 0 15px ${alpha(theme.palette.info.main, 0.7)}` :
                       `0 0 15px ${alpha(theme.palette.success.main, 0.7)}`,
            zIndex: 0,
          }}
          animate={{
            x: [0, Math.random() * 60 - 30, 0],
            y: [0, Math.random() * 80 - 40, 0],
            opacity: [0.4, 0.8, 0.4],
            scale: [1, index % 3 === 0 ? 1.2 : 1.1, 1],
          }}
          transition={{
            duration: 10 + index * 2,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            delay: index * 0.5,
          }}
          style={{
            top: `${10 + (index * 6)}%`,
            left: index % 2 === 0 ? `${5 + (index * 7)}%` : `${85 - (index * 7)}%`,
          }}
        />
      ))}

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            align="center" 
            color="primary"
            sx={{
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(79, 106, 245, 0.5)',
              mb: 4,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                height: '3px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                borderRadius: '10px',
                boxShadow: '0 0 8px rgba(107, 72, 255, 0.6)'
              }
            }}
          >
            AI Podcast Generator
          </Typography>
        </motion.div>
          
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 2,
              background: 'rgba(20, 24, 36, 0.7)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease-in-out',
              position: 'relative',
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              '&:hover': {
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '150px',
                height: '150px',
                background: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                borderRadius: '50%',
                zIndex: 0,
                opacity: 0.5,
                transform: 'translate(30%, 30%)',
              }
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <TextField
                    fullWidth
                    label="Enter your podcast topic"
                    variant="outlined"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    error={!!error && !loading}
                    helperText={error && !loading ? error : ''}
                    multiline
                    rows={3}
                    placeholder="Describe your podcast topic in detail..."
                    InputProps={{
                      startAdornment: (
                        <MicIcon sx={{ mr: 1, mt: 1, color: 'primary.main' }} />
                      ),
                      sx: { 
                        fontSize: '1.2rem',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderWidth: '2px',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderWidth: '2px',
                        },
                      }
                    }}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom
                  sx={{ 
                    position: 'relative',
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      bottom: '-4px',
                      left: 0,
                      width: '40px',
                      height: '2px',
                      background: theme.palette.primary.main
                    }
                  }}
                >
                  Voice Selection
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                      <FormControl fullWidth>
                        <InputLabel>Narrator Voice</InputLabel>
                        <Select
                          value={narratorVoice}
                          label="Narrator Voice"
                          onChange={(e) => setNarratorVoice(e.target.value)}
                          startAdornment={<RecordVoiceOverIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                        >
                          {voices.map((voice) => (
                            <MenuItem key={`narrator-${voice.voice_id}`} value={voice.voice_id}>
                              {voice.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </motion.div>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, delay: 0.05 }}>
                      <FormControl fullWidth>
                        <InputLabel>Host Voice</InputLabel>
                        <Select
                          value={hostVoice}
                          label="Host Voice"
                          onChange={(e) => setHostVoice(e.target.value)}
                          startAdornment={<PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                        >
                          {voices.map((voice) => (
                            <MenuItem key={`host-${voice.voice_id}`} value={voice.voice_id}>
                              {voice.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </motion.div>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}>
                      <FormControl fullWidth>
                        <InputLabel>Guest Voice</InputLabel>
                        <Select
                          value={guestVoice}
                          label="Guest Voice"
                          onChange={(e) => setGuestVoice(e.target.value)}
                          startAdornment={<GroupsIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                        >
                          {voices.map((voice) => (
                            <MenuItem key={`guest-${voice.voice_id}`} value={voice.voice_id}>
                              {voice.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </motion.div>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleGenerate}
                    disabled={loading || !topic.trim()}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.2)}, transparent)`,
                        transition: 'all 0.6s ease',
                      },
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&::before': {
                          left: '100%',
                        }
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: '5px',
                        left: '5px',
                        right: '5px',
                        bottom: '5px',
                        borderRadius: '8px',
                        border: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
                        pointerEvents: 'none'
                      }
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <>
                        <Box component="span" sx={{ mr: 1, display: 'inline-flex' }}>
                          <motion.div
                            animate={{ 
                              rotate: [0, 180, 360],
                              scale: [1, 1.2, 1]
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <EqualizerIcon fontSize="small" />
                          </motion.div>
                        </Box>
                        Generate Podcast Script
                      </>
                    )}
                  </Button>
                </motion.div>
              </Grid>

              <AnimatePresence>
                {error && !loading && (
                  <Grid item xs={12}>
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {error}
                      </Alert>
                    </motion.div>
                  </Grid>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {script && (
                  <Grid item xs={12}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card 
                        elevation={2} 
                        sx={{ 
                          p: 3, 
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          background: `linear-gradient(135deg, ${alpha('#0d101f', 0.9)} 0%, ${alpha('#1a1f35', 0.95)} 100%)`,
                          '&:hover': {
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '60px',
                            height: '60px',
                            borderRight: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                            borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                            borderRadius: '0 12px 0 0',
                            opacity: 0.8
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: '10px',
                            left: '10px',
                            width: '60px',
                            height: '60px',
                            borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.4)}`,
                            borderBottom: `2px solid ${alpha(theme.palette.secondary.main, 0.4)}`,
                            borderRadius: '0 0 0 12px',
                            opacity: 0.8
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" color="primary" 
                            sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              '& svg': {
                                mr: 1
                              }
                            }}
                          >
                            <EqualizerIcon />
                            Generated Script
                          </Typography>
                          <Box>
                            <motion.div className="icon-button-wrapper" style={{ display: 'inline-block' }}
                              whileHover={{ rotate: 10, scale: 1.1 }}
                              whileTap={{ rotate: 0, scale: 0.9 }}
                            >
                              <Tooltip title="Copy Script">
                                <IconButton onClick={handleCopyScript} color="primary">
                                  <ContentCopyIcon />
                                </IconButton>
                              </Tooltip>
                            </motion.div>
                            <motion.div className="icon-button-wrapper" style={{ display: 'inline-block' }}
                              whileHover={{ rotate: -10, scale: 1.1 }}
                              whileTap={{ rotate: 0, scale: 0.9 }}
                            >
                              <Tooltip title="Regenerate">
                                <IconButton onClick={handleRegenerate} color="primary">
                                  <RefreshIcon />
                                </IconButton>
                              </Tooltip>
                            </motion.div>
                            {(audioUrls.narrator || audioUrls.host || audioUrls.guest) && (
                              <motion.div className="icon-button-wrapper" style={{ display: 'inline-block' }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                initial={{ scale: 1 }}
                                animate={{ 
                                  scale: [1, 1.1, 1],
                                  transition: { 
                                    repeat: Infinity, 
                                    repeatType: "reverse", 
                                    duration: 2
                                  }
                                }}
                              >
                                <Tooltip title="Play All Voices in Sequence">
                                  <IconButton 
                                    onClick={handlePlayBySection}
                                    color="secondary"
                                  >
                                    <PlayArrowIcon />
                                  </IconButton>
                                </Tooltip>
                              </motion.div>
                            )}
                          </Box>
                        </Box>
                        
                        <Box sx={{ 
                          borderBottom: 1, 
                          borderColor: 'divider', 
                          mb: 2,
                          position: 'relative',
                          '&:after': {
                            content: '""',
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            height: '1px',
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, transparent)`
                          }
                        }}>
                          <Tabs 
                            value={currentTab} 
                            onChange={handleTabChange} 
                            aria-label="script tabs"
                            TabIndicatorProps={{
                              style: {
                                height: '3px',
                                borderRadius: '3px 3px 0 0'
                              }
                            }}
                          >
                            <Tab 
                              label="Full Script" 
                              sx={{
                                transition: 'all 0.3s',
                                '&.Mui-selected': {
                                  fontWeight: 'bold',
                                  transform: 'scale(1.05)'
                                }
                              }}
                            />
                            <Tab 
                              label="Narrator" 
                              disabled={!scriptParts.narrator}
                              sx={{
                                transition: 'all 0.3s',
                                '&.Mui-selected': {
                                  fontWeight: 'bold',
                                  transform: 'scale(1.05)'
                                }
                              }}
                            />
                            <Tab 
                              label="Host" 
                              disabled={!scriptParts.host}
                              sx={{
                                transition: 'all 0.3s',
                                '&.Mui-selected': {
                                  fontWeight: 'bold',
                                  transform: 'scale(1.05)'
                                }
                              }}
                            />
                            <Tab 
                              label="Guest" 
                              disabled={!scriptParts.guest}
                              sx={{
                                transition: 'all 0.3s',
                                '&.Mui-selected': {
                                  fontWeight: 'bold',
                                  transform: 'scale(1.05)'
                                }
                              }}
                            />
                          </Tabs>
                        </Box>
                        
                        <AnimatePresence mode="wait">
                          {currentTab === 0 && (
                            <motion.div
                              key="full-script"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.8,
                                  color: 'text.secondary'
                                }}
                              >
                                {script}
                              </Typography>
                            </motion.div>
                          )}
                          
                          {currentTab === 1 && scriptParts.narrator && (
                            <motion.div
                              key="narrator-script"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Box>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  mb: 2,
                                  background: alpha(theme.palette.primary.main, 0.05),
                                  p: 1,
                                  borderRadius: 1,
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                                }}>
                                  <RecordVoiceOverIcon sx={{ mr: 1, color: 'primary.main' }} />
                                  <Typography variant="subtitle1" color="primary">Narrator</Typography>
                                  {audioUrls.narrator && (
                                    <motion.div 
                                      animate={{ 
                                        scale: isPlaying.narrator ? [1, 1.1, 1] : 1 
                                      }}
                                      transition={{ 
                                        repeat: isPlaying.narrator ? Infinity : 0, 
                                        duration: 0.8 
                                      }}
                                    >
                                      <IconButton 
                                        onClick={() => handlePlayPause('narrator')} 
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                          ml: 2,
                                          background: alpha(theme.palette.primary.main, 0.1),
                                          '&:hover': {
                                            background: alpha(theme.palette.primary.main, 0.2),
                                          }
                                        }}
                                      >
                                        {isPlaying.narrator ? <PauseIcon /> : <PlayArrowIcon />}
                                      </IconButton>
                                    </motion.div>
                                  )}
                                </Box>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.8,
                                    color: 'text.secondary',
                                    ml: 4
                                  }}
                                >
                                  {scriptParts.narrator}
                                  {audioUrls.narrator && scriptParts.narrator.length > 700 && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ display: 'block', mt: 1, color: 'warning.main' }}
                                    >
                                      Note: Audio has been truncated due to length limits. Full text shown above.
                                    </Typography>
                                  )}
                                </Typography>
                              </Box>
                            </motion.div>
                          )}
                          
                          {currentTab === 2 && scriptParts.host && (
                            <motion.div
                              key="host-script"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Box>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  mb: 2,
                                  background: alpha(theme.palette.info.main, 0.05),
                                  p: 1,
                                  borderRadius: 1,
                                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
                                }}>
                                  <PersonIcon sx={{ mr: 1, color: 'info.main' }} />
                                  <Typography variant="subtitle1" color="info.main">Host</Typography>
                                  {audioUrls.host && (
                                    <motion.div 
                                      animate={{ 
                                        scale: isPlaying.host ? [1, 1.1, 1] : 1 
                                      }}
                                      transition={{ 
                                        repeat: isPlaying.host ? Infinity : 0, 
                                        duration: 0.8 
                                      }}
                                    >
                                      <IconButton 
                                        onClick={() => handlePlayPause('host')} 
                                        color="info"
                                        size="small"
                                        sx={{ 
                                          ml: 2,
                                          background: alpha(theme.palette.info.main, 0.1),
                                          '&:hover': {
                                            background: alpha(theme.palette.info.main, 0.2),
                                          }
                                        }}
                                      >
                                        {isPlaying.host ? <PauseIcon /> : <PlayArrowIcon />}
                                      </IconButton>
                                    </motion.div>
                                  )}
                                </Box>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.8,
                                    color: 'text.secondary',
                                    ml: 4
                                  }}
                                >
                                  {scriptParts.host}
                                  {audioUrls.host && scriptParts.host.length > 700 && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ display: 'block', mt: 1, color: 'warning.main' }}
                                    >
                                      Note: Audio has been truncated due to length limits. Full text shown above.
                                    </Typography>
                                  )}
                                </Typography>
                              </Box>
                            </motion.div>
                          )}
                          
                          {currentTab === 3 && scriptParts.guest && (
                            <motion.div
                              key="guest-script"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Box>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  mb: 2,
                                  background: alpha(theme.palette.secondary.main, 0.05),
                                  p: 1,
                                  borderRadius: 1,
                                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`
                                }}>
                                  <GroupsIcon sx={{ mr: 1, color: 'secondary.main' }} />
                                  <Typography variant="subtitle1" color="secondary.main">Guest</Typography>
                                  {audioUrls.guest && (
                                    <motion.div 
                                      animate={{ 
                                        scale: isPlaying.guest ? [1, 1.1, 1] : 1 
                                      }}
                                      transition={{ 
                                        repeat: isPlaying.guest ? Infinity : 0, 
                                        duration: 0.8 
                                      }}
                                    >
                                      <IconButton 
                                        onClick={() => handlePlayPause('guest')} 
                                        color="secondary"
                                        size="small"
                                        sx={{ 
                                          ml: 2,
                                          background: alpha(theme.palette.secondary.main, 0.1),
                                          '&:hover': {
                                            background: alpha(theme.palette.secondary.main, 0.2),
                                          }
                                        }}
                                      >
                                        {isPlaying.guest ? <PauseIcon /> : <PlayArrowIcon />}
                                      </IconButton>
                                    </motion.div>
                                  )}
                                </Box>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.8,
                                    color: 'text.secondary',
                                    ml: 4
                                  }}
                                >
                                  {scriptParts.guest}
                                  {audioUrls.guest && scriptParts.guest.length > 700 && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ display: 'block', mt: 1, color: 'warning.main' }}
                                    >
                                      Note: Audio has been truncated due to length limits. Full text shown above.
                                    </Typography>
                                  )}
                                </Typography>
                              </Box>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* Audio elements */}
                        {audioUrls.narrator && (
                          <audio
                            ref={narratorAudioRef}
                            src={audioUrls.narrator}
                            onEnded={() => handleAudioEnded('narrator')}
                            style={{ display: 'none' }}
                          />
                        )}
                        {audioUrls.host && (
                          <audio
                            ref={hostAudioRef}
                            src={audioUrls.host}
                            onEnded={() => handleAudioEnded('host')}
                            style={{ display: 'none' }}
                          />
                        )}
                        {audioUrls.guest && (
                          <audio
                            ref={guestAudioRef}
                            src={audioUrls.guest}
                            onEnded={() => handleAudioEnded('guest')}
                            style={{ display: 'none' }}
                          />
                        )}
                      </Card>
                    </motion.div>
                  </Grid>
                )}
              </AnimatePresence>
            </Grid>
          </Card>
        </motion.div>

        {/* Loading overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000
              }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <CircularProgress 
                  size={60} 
                  thickness={4} 
                  sx={{ 
                    color: 'white',
                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))'
                  }} 
                />
              </motion.div>
              <Typography 
                variant="h6" 
                sx={{ 
                  position: 'absolute', 
                  color: 'white',
                  mt: 12,
                  fontWeight: 'medium',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                Generating your podcast...
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </Box>
  );
}

export default App;

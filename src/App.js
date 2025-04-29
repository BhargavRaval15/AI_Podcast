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
  Divider
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import PersonIcon from '@mui/icons-material/Person';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import GroupsIcon from '@mui/icons-material/Groups';
import axios from 'axios';
import { Buffer } from 'buffer';

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
        setVoices(response.data.voices || []);
        if (response.data.voices?.length > 0) {
          // Set different default voices if available
          setNarratorVoice(response.data.voices[0].voice_id);
          setHostVoice(response.data.voices.length > 1 ? response.data.voices[1].voice_id : response.data.voices[0].voice_id);
          setGuestVoice(response.data.voices.length > 2 ? response.data.voices[2].voice_id : response.data.voices[0].voice_id);
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
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            align="center" 
            color="primary"
            sx={{
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              mb: 4
            }}
          >
            AI Podcast Generator
          </Typography>
          
          <Card 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Enter your podcast topic"
                  variant="outlined"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  error={!!error && !loading}
                  helperText={error && !loading ? error : ''}
                  InputProps={{
                    startAdornment: (
                      <MicIcon sx={{ mr: 1, color: 'primary.main' }} />
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Voice Selection
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
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
                  </Grid>
                  <Grid item xs={12} md={4}>
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
                  </Grid>
                  <Grid item xs={12} md={4}>
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
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleGenerate}
                  disabled={loading || !topic.trim()}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    boxShadow: 3,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Generate Podcast Script'
                  )}
                </Button>
              </Grid>

              {error && !loading && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                </Grid>
              )}

              {script && (
                <Grid item xs={12}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        Generated Script
                      </Typography>
                      <Box>
                        <Tooltip title="Copy Script">
                          <IconButton onClick={handleCopyScript} color="primary">
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Regenerate">
                          <IconButton onClick={handleRegenerate} color="primary">
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                        {(audioUrls.narrator || audioUrls.host || audioUrls.guest) && (
                          <Tooltip title="Play All Voices in Sequence">
                            <IconButton 
                              onClick={handlePlayBySection}
                              color="secondary"
                            >
                              <PlayArrowIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                      <Tabs value={currentTab} onChange={handleTabChange} aria-label="script tabs">
                        <Tab label="Full Script" />
                        <Tab label="Narrator" disabled={!scriptParts.narrator} />
                        <Tab label="Host" disabled={!scriptParts.host} />
                        <Tab label="Guest" disabled={!scriptParts.guest} />
                      </Tabs>
                    </Box>
                    
                    {currentTab === 0 && (
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
                    )}
                    
                    {currentTab === 1 && scriptParts.narrator && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <RecordVoiceOverIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle1" color="primary">Narrator</Typography>
                          {audioUrls.narrator && (
                            <IconButton 
                              onClick={() => handlePlayPause('narrator')} 
                              color="primary"
                              size="small"
                              sx={{ ml: 2 }}
                            >
                              {isPlaying.narrator ? <PauseIcon /> : <PlayArrowIcon />}
                            </IconButton>
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
                    )}
                    
                    {currentTab === 2 && scriptParts.host && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle1" color="primary">Host</Typography>
                          {audioUrls.host && (
                            <IconButton 
                              onClick={() => handlePlayPause('host')} 
                              color="primary"
                              size="small"
                              sx={{ ml: 2 }}
                            >
                              {isPlaying.host ? <PauseIcon /> : <PlayArrowIcon />}
                            </IconButton>
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
                    )}
                    
                    {currentTab === 3 && scriptParts.guest && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <GroupsIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle1" color="primary">Guest</Typography>
                          {audioUrls.guest && (
                            <IconButton 
                              onClick={() => handlePlayPause('guest')} 
                              color="primary"
                              size="small"
                              sx={{ ml: 2 }}
                            >
                              {isPlaying.guest ? <PauseIcon /> : <PlayArrowIcon />}
                            </IconButton>
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
                    )}
                    
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
                </Grid>
              )}
            </Grid>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}

export default App;

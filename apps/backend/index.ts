import express from 'express';
import { prismaClient } from 'db';

const app = express();

const PORT = process.env.PORT || 3000;  


app.use(express.json());

app.get('/health', (req, res) => {
  res.send('OK');
});

app.get('/summarise', async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    // TODO: Implement summarization logic
    res.json({ message: 'Summary endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

app.get('/transcribe', async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    // TODO: Implement transcription logic
    res.json({ message: 'Transcribe endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate transcript' });
  }
});

app.get('/make_notes', async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    // TODO: Implement notes generation logic
    res.json({ message: 'Notes endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate notes' });
  }
});

app.get('/get_diagrams', async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    // TODO: Implement diagram generation logic
    res.json({ message: 'Diagrams endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate diagrams' });
  }
});


app.listen(PORT, () => {
  console.log('Server is running on port http://localhost:3000');
});

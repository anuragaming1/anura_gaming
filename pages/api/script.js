import { connectToDatabase } from '../../../lib/database';

export default async function handler(req, res) {
  const { name } = req.query;
  
  if (!name) {
    return res.status(400).send('Missing script name parameter');
  }

  const { client } = await connectToDatabase();

  try {
    const result = await client.query(
      'SELECT curl_content, web_content FROM scripts WHERE script_name = $1',
      [name]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).send('Script not found');
    }

    const scriptData = result.rows[0];
    const userAgent = req.headers['user-agent'] || '';
    
    // PHÂN BIỆT USER-AGENT - QUAN TRỌNG
    const isCurl = userAgent.includes('curl') || 
                   userAgent.includes('Wget') || 
                   userAgent.includes('Termux') ||
                   userAgent.includes('Executor') ||
                   userAgent.includes('python') ||
                   userAgent.includes('node') ||
                   userAgent.includes('Go') ||
                   userAgent.includes('HTTPie') ||
                   userAgent.includes('fetch') ||
                   userAgent.includes('axios');

    // LUÔN set header text/plain để đảm bảo không có HTML
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    if (isCurl) {
      // TRẢ VỀ MÃ NGUỒN THẬT cho curl/Termux
      res.send(scriptData.curl_content || '// No real content available');
    } else {
      // TRẢ VỀ MÃ NGUỒN FAKE cho trình duyệt
      res.send(scriptData.web_content || '// No fake content available');
    }
  } catch (error) {
    console.error('Script API error:', error);
    res.status(500).send('Internal server error');
  } finally {
    client.release();
  }
}

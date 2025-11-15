import { connectToDatabase } from '../../../lib/database';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { client } = await connectToDatabase();

  try {
    if (req.method === 'POST') {
      const { scriptName, curlContent, webContent } = req.body;

      if (!scriptName) {
        return res.status(400).json({ error: 'Script name is required' });
      }

      // Validate script name (only letters, numbers, hyphens)
      if (!/^[a-zA-Z0-9\-]+$/.test(scriptName)) {
        return res.status(400).json({ error: 'Script name can only contain letters, numbers and hyphens' });
      }

      // Kiểm tra script name đã tồn tại cho user này
      const scriptCheck = await client.query(
        'SELECT id FROM scripts WHERE user_id = $1 AND script_name = $2',
        [decoded.userId, scriptName]
      );
      
      if (scriptCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Script name already exists' });
      }

      // Tạo script mới
      const result = await client.query(
        `INSERT INTO scripts (user_id, script_name, curl_content, web_content) 
         VALUES ($1, $2, $3, $4) RETURNING id, script_name, created_at`,
        [decoded.userId, scriptName, curlContent || '', webContent || '']
      );

      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      
      res.status(201).json({
        success: true,
        message: 'Script created successfully',
        script: {
          id: result.rows[0].id,
          name: result.rows[0].script_name,
          curlUrl: `${baseUrl}/api/script?name=${scriptName}`,
          webUrl: `${baseUrl}/api/script?name=${scriptName}`,
          createdAt: result.rows[0].created_at
        }
      });
      
    } else if (req.method === 'GET') {
      // Lấy danh sách scripts của user
      const result = await client.query(
        'SELECT id, script_name, curl_content, web_content, created_at FROM scripts WHERE user_id = $1 ORDER BY created_at DESC',
        [decoded.userId]
      );
      
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      
      const scripts = result.rows.map(script => ({
        id: script.id,
        scriptName: script.script_name,
        curlContent: script.curl_content,
        webContent: script.web_content,
        createdAt: script.created_at,
        url: `${baseUrl}/api/script?name=${script.script_name}`
      }));
      
      res.json({ success: true, scripts });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Scripts API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

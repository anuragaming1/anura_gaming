import { connectToDatabase } from '../../../lib/database';
import { hashPassword, verifyPassword, generateToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { client } = await connectToDatabase();

    try {
      if (action === 'register') {
        // Kiểm tra user đã tồn tại
        const userCheck = await client.query(
          'SELECT id FROM users WHERE username = $1',
          [username]
        );
        
        if (userCheck.rows.length > 0) {
          return res.status(400).json({ error: 'User already exists' });
        }

        // Tạo user mới
        const hashedPassword = hashPassword(password);
        const result = await client.query(
          'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
          [username, hashedPassword]
        );

        const token = generateToken(result.rows[0].id.toString());
        res.status(201).json({ 
          success: true,
          token, 
          username,
          message: 'Registration successful'
        });
        
      } else if (action === 'login') {
        // Đăng nhập
        const result = await client.query(
          'SELECT * FROM users WHERE username = $1',
          [username]
        );
        
        if (result.rows.length === 0 || !verifyPassword(password, result.rows[0].password)) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = generateToken(result.rows[0].id.toString());
        res.json({ 
          success: true,
          token, 
          username,
          message: 'Login successful'
        });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

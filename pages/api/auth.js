import { connectToDatabase } from '../../../lib/database';
import { hashPassword, verifyPassword, generateToken } from '../../../lib/auth';

export default async function handler(req, res) {
  console.log('Auth API called:', req.method, req.body);
  
  if (req.method === 'POST') {
    const { action, username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const { client } = await connectToDatabase();
      console.log('Database connected successfully');

      if (action === 'register') {
        // Kiểm tra user đã tồn tại
        const userCheck = await client.query(
          'SELECT id FROM users WHERE username = $1',
          [username]
        );
        
        if (userCheck.rows.length > 0) {
          client.release();
          return res.status(400).json({ error: 'User already exists' });
        }

        // Tạo user mới
        const hashedPassword = hashPassword(password);
        const result = await client.query(
          'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
          [username, hashedPassword]
        );

        const token = generateToken(result.rows[0].id.toString());
        client.release();
        
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
        
        if (result.rows.length === 0) {
          client.release();
          console.log('User not found:', username);
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = result.rows[0];
        const isPasswordValid = verifyPassword(password, user.password);
        
        if (!isPasswordValid) {
          client.release();
          console.log('Invalid password for user:', username);
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = generateToken(user.id.toString());
        client.release();
        
        console.log('Login successful for user:', username);
        res.json({ 
          success: true,
          token, 
          username,
          message: 'Login successful'
        });
      } else {
        client.release();
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Auth API Error:', error);
      res.status(500).json({ error: 'Database connection failed: ' + error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

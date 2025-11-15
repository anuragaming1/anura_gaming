import { connectToDatabase } from '../../../lib/database';
import { hashPassword, verifyPassword, generateToken } from '../../../lib/auth';

// TÀI KHOẢN ADMIN DUY NHẤT
const ADMIN_USERNAME = 'Anura123';
const ADMIN_PASSWORD = 'Anura123';

export default async function handler(req, res) {
  console.log('Auth API called:', req.method, req.body);
  
  if (req.method === 'POST') {
    const { action, username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
      const { client } = await connectToDatabase();
      
      // CHỈ CHO PHÉP ĐĂNG NHẬP VỚI TÀI KHOẢN ADMIN CỐ ĐỊNH
      if (action === 'login') {
        // Kiểm tra tài khoản admin
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          
          // Kiểm tra xem admin đã tồn tại trong database chưa
          const userCheck = await client.query(
            'SELECT id FROM users WHERE username = $1',
            [ADMIN_USERNAME]
          );
          
          let userId;
          
          if (userCheck.rows.length === 0) {
            // Nếu chưa có, tạo admin user
            const hashedPassword = hashPassword(ADMIN_PASSWORD);
            const result = await client.query(
              'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
              [ADMIN_USERNAME, hashedPassword]
            );
            userId = result.rows[0].id;
          } else {
            userId = userCheck.rows[0].id;
          }
          
          const token = generateToken(userId.toString());
          client.release();
          
          res.json({ 
            success: true,
            token, 
            username: ADMIN_USERNAME,
            message: 'Đăng nhập admin thành công'
          });
        } else {
          client.release();
          res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
        }
      } else {
        // KHÔNG CHO PHÉP ĐĂNG KÝ TÀI KHOẢN MỚI
        client.release();
        res.status(403).json({ error: 'Chức năng đăng ký đã bị vô hiệu hóa' });
      }
    } catch (error) {
      console.error('Auth API Error:', error);
      res.status(500).json({ error: 'Lỗi kết nối database: ' + error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

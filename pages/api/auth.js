import { connectToDatabase } from '../../../lib/database';
import { hashPassword, verifyPassword, generateToken } from '../../../lib/auth';

const ADMIN_USERNAME = 'Anura123';
const ADMIN_PASSWORD = 'Anura123';

export default async function handler(req, res) {
  console.log('🔐 Auth API called:', req.method, req.body);
  
  if (req.method === 'POST') {
    const { action, username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
      console.log('🔄 Connecting to database...');
      const { client } = await connectToDatabase();
      console.log('✅ Database connected in auth API');
      
      // CHỈ CHO PHÉP ĐĂNG NHẬP VỚI TÀI KHOẢN ADMIN CỐ ĐỊNH
      if (action === 'login') {
        console.log('🔑 Processing login for:', username);
        
        // Kiểm tra tài khoản admin
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          console.log('✅ Admin credentials matched');
          
          // Kiểm tra xem admin đã tồn tại trong database chưa
          const userCheck = await client.query(
            'SELECT id FROM users WHERE username = $1',
            [ADMIN_USERNAME]
          );
          
          let userId;
          
          if (userCheck.rows.length === 0) {
            console.log('👤 Creating new admin user in database');
            // Nếu chưa có, tạo admin user
            const hashedPassword = hashPassword(ADMIN_PASSWORD);
            const result = await client.query(
              'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
              [ADMIN_USERNAME, hashedPassword]
            );
            userId = result.rows[0].id;
            console.log('✅ Admin user created with ID:', userId);
          } else {
            userId = userCheck.rows[0].id;
            console.log('✅ Existing admin user found with ID:', userId);
          }
          
          const token = generateToken(userId.toString());
          client.release();
          console.log('✅ Login successful, token generated');
          
          res.json({ 
            success: true,
            token, 
            username: ADMIN_USERNAME,
            message: 'Đăng nhập admin thành công'
          });
        } else {
          client.release();
          console.log('❌ Invalid admin credentials');
          res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
        }
      } else {
        // KHÔNG CHO PHÉP ĐĂNG KÝ TÀI KHOẢN MỚI
        client.release();
        res.status(403).json({ error: 'Chức năng đăng ký đã bị vô hiệu hóa' });
      }
    } catch (error) {
      console.error('💥 Auth API Error:', error);
      res.status(500).json({ 
        error: 'Lỗi hệ thống: ' + error.message,
        details: 'Vui lòng kiểm tra kết nối database'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

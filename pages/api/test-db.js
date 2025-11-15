import { connectToDatabase } from '../../../lib/database';

export default async function handler(req, res) {
  try {
    const { client } = await connectToDatabase();
    const result = await client.query('SELECT NOW() as time');
    client.release();
    
    res.json({ 
      success: true, 
      message: 'Database connected!',
      time: result.rows[0].time 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      connectionString: process.env.DATABASE_URL ? 'Exists' : 'Missing'
    });
  }
}

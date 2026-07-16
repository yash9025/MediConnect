import axios from 'axios';

async function testAuth() {
  try {
    const res = await axios.post('http://localhost:4000/api/user/login', {
      email: 'agrawal6353@gmail.com',
      password: '12345678'
    });
    console.log('Login Response:', res.data);
    console.log('Cookies Set:', res.headers['set-cookie']);

    if (!res.headers['set-cookie']) {
        console.log("NO COOKIES SET!");
        return;
    }

    // Now try to fetch profile
    const cookies = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
    const profileRes = await axios.get('http://localhost:4000/api/user/get-profile', {
      headers: { Cookie: cookies }
    });
    console.log('Profile Response:', profileRes.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testAuth();

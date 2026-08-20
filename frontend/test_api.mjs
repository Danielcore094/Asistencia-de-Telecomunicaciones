import axios from 'axios';

async function main() {
  try {
    const res = await axios.get('http://localhost:3000/api/reportes?courseId=clz8j1gxx000108l62h9v2x4a');
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
main();

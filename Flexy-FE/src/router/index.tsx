import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home/index.tsx';
import Room from '../pages/Room/index.tsx';

function index() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:roomname" element={<Room />}  />
        </Routes>
    </BrowserRouter>
  );
}

export default index
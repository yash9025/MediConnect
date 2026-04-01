import { Outlet } from 'react-router-dom';
import PanelNavbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

const PanelLayout = () => {
  return (
    <div className="bg-[#F8F9FD] min-h-screen">
      <PanelNavbar />
      <div className="flex items-start">
        <Sidebar />
        <Outlet />
      </div>
    </div>
  );
};

export default PanelLayout;

import Board from './pages/Board';
import BoardSettings from './pages/BoardSettings';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import ImportBoard from './pages/ImportBoard';
import Users from './pages/Users';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Board": Board,
    "BoardSettings": BoardSettings,
    "Dashboard": Dashboard,
    "Home": Home,
    "ImportBoard": ImportBoard,
    "Users": Users,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
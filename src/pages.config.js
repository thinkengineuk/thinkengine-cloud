import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import ImportBoard from './pages/ImportBoard';
import BoardSettings from './pages/BoardSettings';
import Users from './pages/Users';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Board": Board,
    "ImportBoard": ImportBoard,
    "BoardSettings": BoardSettings,
    "Users": Users,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
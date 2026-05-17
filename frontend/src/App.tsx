import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PostListPage from './pages/PostListPage';
import PostDetailPage from './pages/PostDetailPage'; // 追加
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>X Like Manager</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/posts">All Posts</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/posts" element={<PostListPage />} />
          <Route path="/posts/:postId" element={<PostDetailPage />} /> {/* 追加 */}
        </Routes>
      </main>
    </div>
  )
}

export default App;

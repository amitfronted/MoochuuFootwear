import LoginBox from './components/LoginBox';
import OuterHeader from './components/OuterHeader';
import PublicRoute from './components/PublicRoute';

export default function Home({ children }) {
  return (
    <>
      <PublicRoute>
        <OuterHeader />
        <LoginBox />
      </PublicRoute>
    </>
  );
}

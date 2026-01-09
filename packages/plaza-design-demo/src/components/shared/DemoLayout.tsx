import { Outlet } from 'react-router-dom';
import { DemoNav } from './DemoNav';
import './DemoLayout.css';

export function DemoLayout() {
  return (
    <div className="demo-layout">
      <DemoNav />
      <main className="demo-main">
        <Outlet />
      </main>
    </div>
  );
}

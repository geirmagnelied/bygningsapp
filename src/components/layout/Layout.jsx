import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import StatusBar from './StatusBar'
import TabNav from './TabNav'

export default function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <TopBar />
      <StatusBar />
      <TabNav />
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Layout Component
 *
 * Main application layout wrapper with header.
 * Wraps all authenticated pages.
 */

import Header from './Header';

/**
 * Layout wrapper component
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Page content
 */
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

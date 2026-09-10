import AccountSidebar from '../components/AccountSidebar/AccountSidebar';
import ProtectedRoute from '../components/ProtectedRoute';

const AccountLayout = ({ children }) => {
  return (
    <ProtectedRoute>
      <section className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <AccountSidebar />
            </aside>

            {/* Only this area changes */}

            <main className="lg:col-span-9">{children}</main>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default AccountLayout;

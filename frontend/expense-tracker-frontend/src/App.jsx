import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

// --- NPM Imports ---
// Import components from the libraries we installed
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// Import all icons we need from lucide-react
import {
  Wallet,
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Target,
  Calendar,
  TrendingUp,
  Inbox,
  Pencil,
  Trash2,
  PlusCircle,
  Utensils,
  Car,
  Lightbulb,
  Home,
  Ticket,
  HeartPulse,
  ShoppingCart,
  Archive,
} from 'lucide-react';

// --- Constants ---
const API_BASE_URL = 'http://localhost:8081/api'; // Your Go backend URL

// --- Reusable Tailwind Classes ---
const cardClasses =
  'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg transition-all hover:shadow-xl';
const buttonClasses =
  'w-full bg-blue-600 dark:bg-blue-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 shadow-md hover:shadow-lg';
const inputClasses =
  'w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all';
const destructiveButtonClasses =
  'w-full bg-red-600 dark:bg-red-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800 shadow-md hover:shadow-lg';
const secondaryButtonClasses =
  'w-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-500 shadow-md hover:shadow-lg';

// --- Icon Component ---
// A helper to map string names to the imported icon components
const iconMap = {
  Wallet,
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Target,
  Calendar,
  TrendingUp,
  Inbox,
  Pencil,
  Trash2,
  PlusCircle,
  Utensils,
  Car,
  Lightbulb,
  Home,
  Ticket,
  HeartPulse,
  ShoppingCart,
  Archive,
};

const Icon = ({ name, color, size = 24, className = '' }) => {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    console.error(`Icon "${name}" not found in iconMap.`);
    return <span className={`inline-block w-${size} h-${size}`}>?</span>;
  }

  return (
    <LucideIcon
      color={color}
      size={size}
      className={className}
      strokeWidth={2}
    />
  );
};

// --- Auth Context ---
// Manages user authentication state globally
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() =>
    localStorage.getItem('username'),
  );
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On initial load, check local storage
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUsername(storedUsername);
      setIsLoggedIn(true);
    }
    setIsLoading(false);
  }, []);

  const login = (newToken, newUsername) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setIsLoggedIn(false);
  };

  const value = {
    token,
    username,
    isLoggedIn,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to easily access auth state
const useAuth = () => useContext(AuthContext);

// --- API Fetch Utility ---
// A wrapper for fetch that includes the auth token
async function apiFetch(url, method, body, token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  console.log(config);

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${method} ${url}:`, err);
    throw err;
  }
}

// --- Reusable Components ---

/**
 * A toast-like notification component
 * @param {object} props
 * @param {string} props.message - The message to display
 * @param {'success' | 'error'} props.type - Type of notification
 * @param {function} props.onClose - Callback to close the notification
 */
function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === 'success'
      ? 'bg-green-500 dark:bg-green-600'
      : 'bg-red-500 dark:bg-red-600';

  return (
    <div
      className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-xl text-white ${bgColor} animate-slide-in-right`}
    >
      <div className="flex items-center justify-between">
        <span className="mr-4">
          {type === 'success' ? (
            <Icon name="CheckCircle" />
          ) : (
            <Icon name="AlertCircle" />
          )}
        </span>
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-4 font-bold text-xl">
          &times;
        </button>
      </div>
    </div>
  );
}

/**
 * A confirmation modal for destructive actions
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message
 * @param {function} props.onConfirm - Callback on confirm
 * @param {function} props.onCancel - Callback on cancel
 */
function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div
        className={`${cardClasses} w-full max-w-md mx-4 transform animate-scale-in`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <Icon name="X" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={onCancel} className={secondaryButtonClasses}>
            Cancel
          </button>
          <button onClick={onConfirm} className={destructiveButtonClasses}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading Spinner Component
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
    </div>
  );
}

// --- Page Components ---

/**
 * Login & Register Page
 * Handles both user login and registration
 */
function LoginRegisterPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notification, setNotification] = useState(null);
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotification(null);
    const url = isLogin ? '/users/login' : '/users/register';

    try {
      const data = await apiFetch(url, 'POST', { username, password });
      if (isLogin) {
        auth.login(data.token, data.username);
      } else {
        setNotification({
          type: 'success',
          message: 'Registration successful! Please log in.',
        });
        setIsLogin(true); // Switch to login view
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className={`${cardClasses} w-full max-w-md`}>
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          {isLogin
            ? 'Sign in to track your expenses'
            : 'Get started in seconds'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClasses}
              placeholder="e.g., johndoe"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className={buttonClasses}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline ml-1"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

/**
 * Dashboard Page
 * Displays metrics and charts
 */
function Dashboard() {
  const [profileData, setProfileData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const auth = useAuth();

  // Fetch both profile and expenses
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const profile = await apiFetch('/profile', 'GET', null, auth.token);
      const expensesData = await apiFetch('/expenses', 'GET', null, auth.token);
      setProfileData(profile);
      setExpenses(expensesData || []);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
    setIsLoading(false);
  }, [auth.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process data for charts
  const categoryChartData = useMemo(() => {
    if (!expenses.length) return [];
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [expenses]);

  const monthlyVsLimitData = useMemo(() => {
    if (!profileData) return [];
    return [
      {
        name: 'Monthly Spending',
        Spent: parseFloat(profileData.expensesCurrentMonth.toFixed(2)),
        Limit: parseFloat(profileData.monthlyLimit.toFixed(2)),
      },
    ];
  }, [profileData]);

  const expensesOverTimeData = useMemo(() => {
    if (!expenses.length) return [];
    // Get expenses from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTotals = expenses
      .filter((exp) => new Date(exp.date) >= thirtyDaysAgo)
      .reduce((acc, exp) => {
        const date = new Date(exp.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
        acc[date] = (acc[date] || 0) + exp.amount;
        return acc;
      }, {});

    return Object.entries(dailyTotals)
      .map(([date, amount]) => ({
        date,
        amount: parseFloat(amount.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // sort by date
  }, [expenses]);

  const PIE_COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884D8',
    '#FF8042',
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        Could not load profile data.
      </div>
    );
  }

  // Helper for formatting currency
  const formatCurrency = (value) =>
    `$${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="animate-fade-in space-y-8">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {profileData.monthlyLimitExceeded && (
        <div className="p-4 bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 rounded-lg shadow-md">
          <div className="flex items-center">
            <Icon name="AlertTriangle" className="text-red-500 mr-3" />
            <p className="font-bold">
              Warning: You have exceeded your monthly limit of{' '}
              {formatCurrency(profileData.monthlyLimit)}!
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Current Month Total"
          value={formatCurrency(profileData.expensesCurrentMonth)}
          icon="TrendingUp"
          color="text-green-500"
        />
        <MetricCard
          title="Last 7 Days Total"
          value={formatCurrency(profileData.expensesLast7Days)}
          icon="Calendar"
          color="text-blue-500"
        />
        <MetricCard
          title="Monthly Limit"
          value={
            profileData.monthlyLimit > 0
              ? formatCurrency(profileData.monthlyLimit)
              : 'Not Set'
          }
          icon="Target"
          color="text-yellow-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Limit Chart */}
        <div className={`${cardClasses} lg:col-span-2`}>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Monthly Spending vs. Limit
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyVsLimitData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(156, 163, 175, 0.3)"
                />
                <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(5px)',
                    borderRadius: '10px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="Spent" fill="#FF8042" radius={[10, 10, 0, 0]} />
                <Bar dataKey="Limit" fill="#0088FE" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className={cardClasses}>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Spending by Category
          </h3>
          <div className="h-80">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const radius =
                        innerRadius + (outerRadius - innerRadius) * 1.2;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#374151"
                          className="dark:fill-gray-200"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          fontSize="14"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No spending data for categories.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Over Time Chart */}
      <div className={cardClasses}>
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Spending (Last 30 Days)
        </h3>
        <div className="h-80">
          {expensesOverTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={expensesOverTimeData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(156, 163, 175, 0.3)"
                />
                <XAxis dataKey="date" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(5px)',
                    borderRadius: '10px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#8884d8"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No spending data for the last 30 days.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metric Card sub-component for Dashboard
function MetricCard({ title, value, icon, color }) {
  return (
    <div className={cardClasses}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
          {title}
        </span>
        <span className={color}>
          <Icon name={icon} size={28} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

/**
 * Expense Form
 * Reusable form for adding and editing expenses
 */
function ExpenseForm({ expenseToEdit, onSave, onCancel }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

  // Pre-fill form if we are editing
  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.amount.toString());
      setCategory(expenseToEdit.category);
      setDescription(expenseToEdit.description);
      setDate(new Date(expenseToEdit.date).toISOString().split('T')[0]);
    } else {
      // Reset form if switching from edit to add
      setAmount('');
      setCategory('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [expenseToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !category || !date) {
      // Use our custom notification instead of alert()
      // This requires passing setNotification down, or using a context
      // For simplicity, we'll keep alert() for now, but this is where you'd change it
      alert('Please fill in amount, category, and date.');
      return;
    }

    const expenseData = {
      amount: parseFloat(amount),
      category,
      description,
      date: new Date(date).toISOString(), // Send as ISO string
    };
    onSave(expenseData);
  };

  const categories = [
    'Food',
    'Transport',
    'Utilities',
    'Rent',
    'Entertainment',
    'Health',
    'Shopping',
    'Other',
  ];

  return (
    <div className={`${cardClasses} mb-8 animate-fade-in`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Amount
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClasses}
              placeholder="0.00"
              required
              step="0.01"
            />
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Date
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClasses}
              required
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClasses}
            required
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClasses}
            rows="3"
            placeholder="e.g., Lunch with client"
          ></textarea>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <button type="button" onClick={onCancel} className={secondaryButtonClasses}>
            Cancel
          </button>
          <button type="submit" className={buttonClasses}>
            {expenseToEdit ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Expenses Page
 * List, add, edit, and delete expenses
 */
function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null); // null for add, or expense object for edit
  const [deletingExpenseId, setDeletingExpenseId] = useState(null); // ID of expense to delete
  const auth = useAuth();

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/expenses', 'GET', null, auth.token);
      setExpenses(data || []);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
    setIsLoading(false);
  }, [auth.token]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Handle saving an expense (add or edit)
  const handleSaveExpense = async (expenseData) => {
    const isEditing = !!editingExpense;
    const url = isEditing
      ? `/expenses/${editingExpense.id}`
      : '/expenses';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      await apiFetch(url, method, expenseData, auth.token);
      setNotification({
        type: 'success',
        message: `Expense ${isEditing ? 'updated' : 'added'} successfully!`,
      });
      fetchExpenses(); // Re-fetch all expenses
      setShowForm(false);
      setEditingExpense(null);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Handle deleting an expense
  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;

    try {
      await apiFetch(
        `/expenses/${deletingExpenseId}`,
        'DELETE',
        null,
        auth.token,
      );
      setNotification({
        type: 'success',
        message: 'Expense deleted successfully!',
      });
      fetchExpenses(); // Re-fetch
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
    setDeletingExpenseId(null); // Close modal
  };

  // Open form for editing
  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open form for adding
  const handleAddClick = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  // Cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  return (
    <div className="animate-fade-in">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <ConfirmationModal
        isOpen={!!deletingExpenseId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeletingExpenseId(null)}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          My Expenses
        </h1>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className={`${buttonClasses} w-auto flex items-center gap-2`}
          >
            <Icon name="PlusCircle" />
            Add Expense
          </button>
        )}
      </div>

      {showForm && (
        <ExpenseForm
          expenseToEdit={editingExpense}
          onSave={handleSaveExpense}
          onCancel={handleCancelForm}
        />
      )}

      {/* Expense List */}
      <div className={`${cardClasses}`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center p-12">
            <Icon
              name="Inbox"
              size={64}
              className="text-gray-400 dark:text-gray-500 mx-auto"
            />
            <h3 className="mt-4 text-xl font-medium text-gray-700 dark:text-gray-300">
              No expenses yet
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Click "Add Expense" to get started.
            </p>
          </div>
        ) : (
          <ExpenseList
            expenses={expenses}
            onEdit={handleEditClick}
            onDelete={(id) => setDeletingExpenseId(id)}
          />
        )}
      </div>
    </div>
  );
}

// Expense List sub-component for ExpensesPage
function ExpenseList({ expenses, onEdit, onDelete }) {
  // Group expenses by date
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const date = new Date(expense.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(expense);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(groupedExpenses).map(([date, expensesOnDate]) => (
        <div key={date}>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            {date}
          </h3>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {expensesOnDate.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Expense Item sub-component
function ExpenseItem({ expense, onEdit, onDelete }) {
  const formatCurrency = (value) =>
    `$${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const categoryIcons = {
    Food: 'Utensils',
    Transport: 'Car',
    Utilities: 'Lightbulb',
    Rent: 'Home',
    Entertainment: 'Ticket',
    Health: 'HeartPulse',
    Shopping: 'ShoppingCart',
    Other: 'Archive',
  };

  return (
    <li className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 space-y-3 md:space-y-0">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Icon
            name={categoryIcons[expense.category] || 'Archive'}
            className="text-blue-600 dark:text-blue-300"
          />
        </div>
        <div>
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {expense.category}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {expense.description || 'No description'}
          </p>
        </div>
      </div>
      <div className="flex items-center w-full md:w-auto">
        <p className="text-lg font-semibold text-gray-900 dark:text-white flex-grow">
          {formatCurrency(expense.amount)}
        </p>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => onEdit(expense)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Edit"
          >
            <Icon name="Pencil" size={20} />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Delete"
          >
            <Icon name="Trash2" size={20} />
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Profile Page
 * View profile info and update monthly limit
 */
function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [newLimit, setNewLimit] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const auth = useAuth();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/profile', 'GET', null, auth.token);
      setProfile(data);
      setNewLimit(data.monthlyLimit > 0 ? data.monthlyLimit.toString() : '');
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
    setIsLoading(false);
  }, [auth.token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(
        '/profile/limit',
        'PUT',
        { limit: parseFloat(newLimit) || 0 },
        auth.token,
      );
      setNotification({
        type: 'success',
        message: 'Monthly limit updated!',
      });
      fetchProfile(); // Re-fetch to confirm
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
        Profile & Settings
      </h1>

      <div className={cardClasses}>
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {auth.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {auth.username}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Welcome to your profile.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateLimit} className="space-y-6">
          <div>
            <label
              htmlFor="monthlyLimit"
              className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Set Your Monthly Expense Limit
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Set to 0 to remove the limit.
            </p>
            <input
              type="number"
              id="monthlyLimit"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className={inputClasses}
              placeholder="e.g., 1000"
              step="10"
            />
          </div>
          <button type="submit" className={buttonClasses}>
            Update Limit
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Main Application Layout ---

/**
 * Main application layout for logged-in users
 */
function MainLayout() {
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const auth = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Expenses':
        return <ExpensesPage />;
      case 'Profile':
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  const NavItem = ({ icon, label, page }) => (
    <li>
      <button
        onClick={() => {
          setCurrentPage(page);
          setIsMobileMenuOpen(false);
        }}
        className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ${
          currentPage === page
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        <Icon name={icon} className="mr-3" />
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 dark:bg-gray-900 shadow-xl transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between h-20 px-6 bg-gray-900 dark:bg-gray-950">
            <div className="flex items-center text-white">
              <Icon name="Wallet" size={28} className="text-blue-400" />
              <span className="ml-3 text-2xl font-bold">Expense</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <Icon name="X" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-3">
              <NavItem icon="LayoutDashboard" label="Dashboard" page="Dashboard" />
              <NavItem icon="FileText" label="Expenses" page="Expenses" />
              <NavItem icon="User" label="Profile" page="Profile" />
            </ul>
          </nav>

          {/* User/Logout */}
          <div className="p-4 mt-auto border-t border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {auth.username.charAt(0).toUpperCase()}
              </div>
              <span className="ml-3 font-medium text-white">
                {auth.username}
              </span>
            </div>
            <button
              onClick={auth.logout}
              className="w-full flex items-center justify-center p-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
            >
              <Icon name="LogOut" className="mr-3" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
          <div className="flex items-center text-gray-900 dark:text-white">
            <Icon name="Wallet" size={24} className="text-blue-500" />
            <span className="ml-2 text-xl font-bold">Expense</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-600 dark:text-gray-300"
          >
            <Icon name="Menu" />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-10">
          <div className="max-w-7xl mx-auto">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * Main App Component
 * Handles routing between Auth and Main App
 */
function App() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <React.Fragment>
      {auth.isLoggedIn ? <MainLayout /> : <LoginRegisterPage />}
    </React.Fragment>
  );
}

// EXPORT the components for index.js
export { App, AuthProvider };
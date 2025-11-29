import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { 
  Calendar, AlertTriangle, CheckCircle, Clock, Plus, Trash2, Save, 
  BarChart2, FileText, ChevronDown, ChevronUp, RefreshCw, Download, Search, Printer, Layers, FolderOpen
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, writeBatch 
} from 'firebase/firestore';

// --- YOUR LIVE FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBLexjr5lk9EXeFmvPlm0MMaeFGFqiTCuY",
  authDomain: "sms-tracker-live.firebaseapp.com",
  projectId: "sms-tracker-live",
  storageBucket: "sms-tracker-live.firebasestorage.app",
  messagingSenderId: "180384299450",
  appId: "1:180384299450:web:47ede5d873b1134ced0583",
  measurementId: "G-KP7B7EGFET"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants & Helpers ---
const AREAS = [
  "Water Complex", 
  "Furnace Area", 
  "Shed Area", 
  "CCM Area", 
  "DG Room", 
  "General"
];

const STATUS_COLORS = {
  "On Track": "#10B981", // Green
  "Critical": "#F59E0B", // Amber
  "Overdue": "#EF4444",  // Red
  "Completed": "#3B82F6", // Blue
  "Delayed Completion": "#8B5CF6" // Purple
};

const getStatus = (targetDate, actualDate) => {
  if (actualDate) {
    return new Date(actualDate) > new Date(targetDate) ? "Delayed Completion" : "Completed";
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  if (diffDays < 0) return "Overdue";
  if (diffDays <= 3) return "Critical";
  return "On Track";
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// --- Components ---

const StatCard = ({ title, value, icon: Icon, colorClass, subtext }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-4 print:border-slate-300">
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 print:bg-opacity-0`}>
      <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')} print:text-black`} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium print:text-slate-600">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 print:text-black">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1 print:text-slate-500">{subtext}</p>}
    </div>
  </div>
);

const ProgressBar = ({ progress, colorClass = "bg-blue-500", height = "h-2.5" }) => (
  <div className={`w-full bg-slate-100 rounded-full ${height} mb-1 border border-slate-200 overflow-hidden`}>
    <div 
      className={`${height} rounded-full transition-all duration-500 ease-out ${progress === 100 ? 'bg-green-500' : colorClass}`} 
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

const TaskForm = ({ onSave, onCancel, initialData, existingTopics }) => {
  const [formData, setFormData] = useState({
    area: initialData?.area || AREAS[0],
    topic: initialData?.topic || '',
    task: initialData?.task || '',
    targetDate: initialData?.targetDate || '',
    actualDate: initialData?.actualDate || '',
    progress: initialData?.progress || 0,
    remarks: initialData?.remarks || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Default topic if empty
    const dataToSave = {
      ...formData,
      topic: formData.topic.trim() || "General Tasks"
    };
    onSave(dataToSave);
  };

  const handleProgressChange = (e) => {
    const val = parseInt(e.target.value);
    const updates = { progress: val };
    if (val === 100 && !formData.actualDate) {
      updates.actualDate = new Date().toISOString().split('T')[0];
    } else if (val < 100 && formData.actualDate) {
        updates.actualDate = ''; // Clear date if unchecked
    }
    setFormData({ ...formData, ...updates });
  };

  // Filter topics based on selected area
  const suggestedTopics = existingTopics[formData.area] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-semibold text-lg">{initialData ? 'Edit Subtopic' : 'New Subtopic'}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition">
            <Plus className="w-6 h-6 transform rotate-45" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Area</label>
            <select 
              required
              className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              value={formData.area}
              onChange={e => setFormData({...formData, area: e.target.value})}
            >
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Topic (Group)</label>
            <input 
              type="text"
              list="topics-list"
              className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              placeholder="e.g., Scale Pit, Control Room"
              value={formData.topic}
              onChange={e => setFormData({...formData, topic: e.target.value})}
            />
            <datalist id="topics-list">
              {suggestedTopics.map(t => <option key={t} value={t} />)}
            </datalist>
            <p className="text-xs text-slate-400 mt-1">Group related tasks (e.g., all "Scale Pit" works)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subtopic / Task Name</label>
            <input 
              required
              type="text"
              className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              placeholder="e.g., Drain, Stair, Brickwork"
              value={formData.task}
              onChange={e => setFormData({...formData, task: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Progress: {formData.progress}%</label>
            <input 
              type="range"
              min="0"
              max="100"
              step="5"
              className="w-full"
              value={formData.progress}
              onChange={handleProgressChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
              <input 
                required
                type="date"
                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                value={formData.targetDate}
                onChange={e => setFormData({...formData, targetDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actual Date</label>
              <input 
                type="date"
                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                value={formData.actualDate}
                onChange={e => setFormData({...formData, actualDate: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea 
              className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              rows="2"
              placeholder="Delays, resource issues, etc."
              value={formData.remarks}
              onChange={e => setFormData({...formData, remarks: e.target.value})}
            />
          </div>
          <div className="pt-4 flex space-x-3">
            <button 
              type="button" 
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex justify-center items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function SMSTracker() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'table' or 'grouped'
  const [isLoading, setIsLoading] = useState(true);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      // Simplified auth for live deployment
      await signInAnonymously(auth);
    };
    initAuth();
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Note: We removed 'user.uid' dependency for the data path
    // This allows everyone to see the SAME 'tasks' list
    
    const q = query(
      collection(db, 'tasks'), // Simplified public path
      orderBy('targetDate')
    );

    const unsubscribeData = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(fetchedTasks);
      setIsLoading(false);
    }, (error) => {
      console.error("Data fetch error:", error);
      setIsLoading(false);
    });

    return () => unsubscribeData();
  }, []); // Empty dependency array = runs once

  // --- Actions ---

  const handleSave = async (data) => {
    // Saving to the public 'tasks' collection
    const collectionRef = collection(db, 'tasks');
    
    if (editingTask) {
      const docRef = doc(collectionRef, editingTask.id);
      await updateDoc(docRef, data);
    } else {
      await addDoc(collectionRef, {
        ...data,
        createdAt: new Date().toISOString()
      });
    }
    setShowForm(false);
    setEditingTask(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subtopic?")) return;
    await deleteDoc(doc(db, 'tasks', id));
  };

  const handleExport = () => {
    if (tasks.length === 0) return;

    const headers = ["Area", "Topic", "Subtopic", "Status", "Progress (%)", "Target Date", "Actual Date", "Remarks"];
    const csvContent = [
      headers.join(","),
      ...tasks.map(t => {
        const status = getStatus(t.targetDate, t.actualDate);
        return [
          `"${t.area}"`,
          `"${t.topic || 'General'}"`,
          `"${t.task}"`,
          `"${status}"`,
          `"${t.progress || 0}"`,
          `"${t.targetDate}"`,
          `"${t.actualDate || ''}"`,
          `"${t.remarks || ''}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `SMS_Schedule_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const loadDemoData = async () => {
    // Updated Demo Data with Topics structure from PDF
    const demoData = [
      // Shed Area
      { area: "Shed Area", topic: "B-Row Foundation", task: "3 Nos Foundations", targetDate: "2025-12-04", actualDate: "", progress: 60, remarks: "Shuttering in progress" },
      { area: "Shed Area", topic: "Columns", task: "1st Lift Column Wall", targetDate: "2025-12-30", actualDate: "", progress: 0, remarks: "" },
      
      // CCM Area - Hierarchical
      { area: "CCM Area", topic: "Scale Pit", task: "Final Wall Casting (+300)", targetDate: "2025-12-05", actualDate: "", progress: 40, remarks: "Concrete pump booking required" },
      { area: "CCM Area", topic: "CCM Control Room", task: "Slab-1 (+4.900)", targetDate: "2025-12-20", actualDate: "", progress: 10, remarks: "Check date typo in original doc" },
      { area: "CCM Area", topic: "CCM Part-1", task: "Stair Case", targetDate: "2025-12-10", actualDate: "", progress: 10, remarks: "" },
      
      // Water Complex
      { area: "Water Complex", topic: "Cooling Tower", task: "Pedestal", targetDate: "2025-12-06", actualDate: "", progress: 20, remarks: "Starter bars check" },
      { area: "Water Complex", topic: "Overhead Tank", task: "Beam (+12.825)", targetDate: "2025-12-08", actualDate: "", progress: 0, remarks: "Staging stability check" },
      { area: "Water Complex", topic: "Overhead Tank", task: "Slab (+15.600)", targetDate: "2025-12-23", actualDate: "", progress: 0, remarks: "15 day cycle time challenge" },
      { area: "Water Complex", topic: "Overhead Tank", task: "Wall & Slab (+17.400)", targetDate: "2026-01-05", actualDate: "", progress: 0, remarks: "" },
      
      // Furnace
      { area: "Furnace Area", topic: "Pollution Control", task: "Equipment Foundation", targetDate: "2025-12-16", actualDate: "", progress: 0, remarks: "" },
      { area: "Furnace Area", topic: "General Civil", task: "Trench & Flooring", targetDate: "2026-01-20", actualDate: "", progress: 0, remarks: "" }
    ];

    const batch = writeBatch(db);
    const collectionRef = collection(db, 'tasks');
    
    demoData.forEach(task => {
      const docRef = doc(collectionRef);
      batch.set(docRef, { ...task, createdAt: new Date().toISOString() });
    });

    await batch.commit();
  };

  // --- Process Data for View ---

  const filteredTasks = tasks.filter(t => {
    const matchesArea = filter === 'All' || t.area === filter;
    const matchesSearch = t.task.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.topic && t.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesArea && matchesSearch;
  });

  // Unique topics for suggestion in form
  const existingTopics = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!map[t.area]) map[t.area] = new Set();
      if (t.topic) map[t.area].add(t.topic);
    });
    const result = {};
    Object.keys(map).forEach(k => result[k] = Array.from(map[k]));
    return result;
  }, [tasks]);

  // Grouping Logic
  const groupedData = useMemo(() => {
    const groups = {};
    
    filteredTasks.forEach(task => {
      const area = task.area;
      const topic = task.topic || "General Tasks";
      
      if (!groups[area]) groups[area] = { 
        name: area, 
        topics: {}, 
        totalProgress: 0, 
        taskCount: 0 
      };
      
      if (!groups[area].topics[topic]) groups[area].topics[topic] = { 
        name: topic, 
        tasks: [], 
        progress: 0 
      };
      
      groups[area].topics[topic].tasks.push(task);
      groups[area].taskCount++;
    });

    // Calculate Averages
    Object.values(groups).forEach(areaGroup => {
      let areaTotalProg = 0;
      
      Object.values(areaGroup.topics).forEach(topicGroup => {
        const topicTotal = topicGroup.tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
        topicGroup.progress = Math.round(topicTotal / topicGroup.tasks.length);
        areaTotalProg += topicTotal;
      });

      areaGroup.totalProgress = areaGroup.taskCount > 0 
        ? Math.round(areaTotalProg / areaGroup.taskCount) 
        : 0;
    });

    return groups;
  }, [filteredTasks]);

  // --- Statistics ---

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.actualDate).length;
    
    const statusCounts = tasks.reduce((acc, t) => {
      const status = getStatus(t.targetDate, t.actualDate);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const critical = statusCounts["Critical"] || 0;
    const overdue = statusCounts["Overdue"] || 0;
    
    const activeTasks = tasks.filter(t => !t.actualDate);
    const avgProgress = activeTasks.length > 0 
      ? Math.round(activeTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / activeTasks.length) 
      : 0;
    
    return { total, completed, critical, overdue, statusCounts, avgProgress };
  }, [tasks]);

  const chartData = useMemo(() => {
    return Object.keys(STATUS_COLORS).map(status => ({
      name: status,
      value: stats.statusCounts[status] || 0
    })).filter(d => d.value > 0);
  }, [stats]);

  const upcomingTasks = tasks
    .filter(t => !t.actualDate)
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
    .slice(0, 5);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 print:bg-white">
      
      {/* Navbar (Hidden on Print) */}
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">SMS Project Tracker</h1>
                <p className="text-xs text-slate-400">Triveni Infra Schedule Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.print()}
                className="text-slate-300 hover:text-white transition"
                title="Print Report"
              >
                <Printer className="w-5 h-5" />
              </button>
              {tasks.length === 0 && (
                <button 
                  onClick={loadDemoData}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Load Data</span>
                </button>
              )}
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                {user ? "JE" : "..."}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Print Header */}
      <div className="hidden print:block mb-8 text-center pt-8">
        <h1 className="text-2xl font-bold text-black">SMS Area - Status Report</h1>
        <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 print:py-0 print:px-0">
        
        {/* Statistics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          <StatCard 
            title="Total Tasks" 
            value={stats.total} 
            icon={FileText} 
            colorClass="bg-blue-500" 
          />
          <StatCard 
            title="Completed" 
            value={stats.completed} 
            subtext={`${Math.round((stats.completed/stats.total || 0)*100)}% Complete`}
            icon={CheckCircle} 
            colorClass="bg-green-500" 
          />
          <StatCard 
            title="Avg Progress" 
            value={`${stats.avgProgress}%`}
            subtext="Across all active tasks"
            icon={BarChart2} 
            colorClass="bg-indigo-500" 
          />
          <StatCard 
            title="Critical / Overdue" 
            value={stats.critical + stats.overdue} 
            icon={AlertTriangle} 
            colorClass="bg-red-500" 
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-2 print:break-inside-avoid">
          {/* Main Visual Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2 print:border-slate-300">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <BarChart2 className="w-5 h-5 mr-2 text-blue-600 print:hidden" />
              Upcoming Deadlines
            </h2>
            <div className="h-64">
              {tasks.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={upcomingTasks.map(t => ({
                      name: t.task.length > 15 ? t.task.substring(0,15) + '...' : t.task,
                      daysUntil: Math.ceil((new Date(t.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 12}} />
                    <Bar dataKey="daysUntil" barSize={20} radius={[0, 4, 4, 0]}>
                      {upcomingTasks.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.daysUntil < 3 ? '#F59E0B' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p>No data to display</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 print:border-slate-300">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Status Overview</h2>
            <div className="h-64">
               {tasks.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}}/>
                  </PieChart>
                </ResponsiveContainer>
               ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <p>No data</p>
                </div>
               )}
            </div>
          </div>
        </div>

        {/* --- MAIN TASK VIEW --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-0 min-h-[500px]">
          
          {/* Controls Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden bg-white sticky top-0 z-10">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-blue-600" />
              Work Schedule
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              {/* View Switcher */}
              <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                 <button 
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'grouped' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   Topic View
                 </button>
                 <button 
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   Table View
                 </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search subtopics..."
                  className="pl-9 pr-2 py-2 w-full border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter */}
              <select 
                className="w-full sm:w-auto border-slate-300 rounded-lg text-sm p-2 bg-slate-50"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="All">All Areas</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {/* Export */}
              <button 
                onClick={handleExport}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Add */}
              <button 
                onClick={() => { setEditingTask(null); setShowForm(true); }}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Subtopic</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {/* --- CONTENT AREA --- */}
          <div className="p-6">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>No tasks found. Click "Load Data" or Add Subtopic to start.</p>
              </div>
            ) : viewMode === 'table' ? (
              // TABLE VIEW (Legacy)
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left print:text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Area / Topic</th>
                      <th className="px-6 py-4">Subtopic</th>
                      <th className="px-6 py-4 w-32">Progress</th>
                      <th className="px-6 py-4">Target</th>
                      <th className="px-6 py-4">Actual</th>
                      <th className="px-6 py-4">Remarks</th>
                      <th className="px-6 py-4 text-right print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.map((task) => {
                      const status = getStatus(task.targetDate, task.actualDate);
                      const statusColor = STATUS_COLORS[status];
                      return (
                        <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: `${statusColor}15`, color: statusColor, borderColor: `${statusColor}30` }}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-700">{task.area}</div>
                            <div className="text-xs text-slate-500">{task.topic || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-800 font-semibold">{task.task}</td>
                          <td className="px-6 py-4"><ProgressBar progress={task.progress || 0} /></td>
                          <td className="px-6 py-4 text-slate-600 font-mono">{formatDate(task.targetDate)}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono">{task.actualDate ? formatDate(task.actualDate) : "-"}</td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{task.remarks || "-"}</td>
                          <td className="px-6 py-4 text-right print:hidden">
                            <button onClick={() => { setEditingTask(task); setShowForm(true); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><FileText className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              // GROUPED TOPIC VIEW (New Feature)
              <div className="space-y-8">
                {Object.values(groupedData).map(areaGroup => (
                  <div key={areaGroup.name} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* AREA HEADER */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                          <FolderOpen className="w-5 h-5 mr-2 text-slate-500" />
                          {areaGroup.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{areaGroup.taskCount} Total Subtopics</p>
                      </div>
                      <div className="w-full md:w-1/3">
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>Area Progress</span>
                          <span>{areaGroup.totalProgress}%</span>
                        </div>
                        <ProgressBar progress={areaGroup.totalProgress} height="h-3" colorClass="bg-indigo-500" />
                      </div>
                    </div>

                    {/* TOPICS LIST */}
                    <div className="divide-y divide-slate-100 bg-white">
                      {Object.values(areaGroup.topics).map(topic => (
                        <div key={topic.name} className="p-6">
                           {/* TOPIC HEADER */}
                           <div className="flex justify-between items-center mb-4">
                             <div className="flex items-center space-x-3">
                               <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                               <h4 className="font-semibold text-slate-700">{topic.name}</h4>
                               <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{topic.tasks.length} tasks</span>
                             </div>
                             <div className="w-32 hidden sm:block">
                               <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                 <span>Topic Complete</span>
                                 <span>{topic.progress}%</span>
                               </div>
                               <ProgressBar progress={topic.progress} height="h-1.5" />
                             </div>
                           </div>

                           {/* TASKS GRID */}
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                             {topic.tasks.map(task => {
                               const status = getStatus(task.targetDate, task.actualDate);
                               const statusColor = STATUS_COLORS[status];
                               return (
                                 <div key={task.id} className="border border-slate-100 rounded-lg p-3 hover:shadow-md transition bg-slate-50 hover:bg-white group relative">
                                   <div className="flex justify-between items-start mb-2">
                                     <span className="text-xs px-2 py-0.5 rounded border" style={{ color: statusColor, borderColor: `${statusColor}40`, backgroundColor: `${statusColor}10` }}>
                                       {status}
                                     </span>
                                     <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => { setEditingTask(task); setShowForm(true); }} className="text-slate-400 hover:text-blue-600"><FileText className="w-3 h-3" /></button>
                                       <button onClick={() => handleDelete(task.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                     </div>
                                   </div>
                                   
                                   <div className="mb-3">
                                     <h5 className="font-semibold text-slate-800 text-sm leading-tight mb-1">{task.task}</h5>
                                     <p className="text-xs text-slate-500 font-mono">Due: {formatDate(task.targetDate)}</p>
                                   </div>

                                   <div className="flex items-center space-x-2">
                                     <div className="flex-1">
                                       <ProgressBar progress={task.progress} height="h-1.5" />
                                     </div>
                                     <span className="text-xs font-medium text-slate-600 w-8 text-right">{task.progress}%</span>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Form */}
      {showForm && (
        <TaskForm 
          onSave={handleSave} 
          onCancel={() => { setShowForm(false); setEditingTask(null); }} 
          initialData={editingTask}
          existingTopics={existingTopics}
        />
      )}
    </div>
  );
}

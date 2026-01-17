import { useState } from 'react';
import { Utensils, Calendar, Users, TrendingUp } from 'lucide-react';

interface StaffMeal {
    id: string;
    date: string;
    employeeName: string;
    department: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    amount: number;
}

const StaffMealTracking = () => {
    const [meals] = useState<StaffMeal[]>([
        { id: '1', date: '2024-01-17', employeeName: 'John Doe', department: 'Housekeeping', mealType: 'lunch', amount: 15 },
        { id: '2', date: '2024-01-17', employeeName: 'Jane Smith', department: 'Front Desk', mealType: 'lunch', amount: 15 },
        { id: '3', date: '2024-01-17', employeeName: 'Mike Johnson', department: 'Kitchen', mealType: 'dinner', amount: 20 },
        { id: '4', date: '2024-01-16', employeeName: 'Sarah Williams', department: 'Housekeeping', mealType: 'lunch', amount: 15 }
    ]);

    const totalToday = meals.filter(m => m.date === '2024-01-17').reduce((sum, m) => sum + m.amount, 0);
    const totalThisMonth = meals.reduce((sum, m) => sum + m.amount, 0);

    const byDepartment = meals.reduce((acc, meal) => {
        acc[meal.department] = (acc[meal.department] || 0) + meal.amount;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Utensils size={28} />
                        Staff Meal Tracking
                    </h1>
                    <p className="text-gray-600">Track employee meals and department allocation</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Today's Meals</span>
                            <Calendar className="text-blue-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">${totalToday}</p>
                        <p className="text-xs text-gray-500 mt-1">{meals.filter(m => m.date === '2024-01-17').length} meals</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">This Month</span>
                            <TrendingUp className="text-green-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">${totalThisMonth}</p>
                        <p className="text-xs text-gray-500 mt-1">{meals.length} total meals</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Departments</span>
                            <Users className="text-purple-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{Object.keys(byDepartment).length}</p>
                        <p className="text-xs text-gray-500 mt-1">Active departments</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Meals</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meal Type</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {meals.map((meal) => (
                                    <tr key={meal.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{meal.date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{meal.employeeName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{meal.department}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                                                {meal.mealType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">${meal.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Department Breakdown</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {Object.entries(byDepartment).map(([dept, amount]) => (
                                <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium text-gray-900">{dept}</span>
                                    <span className="text-lg font-bold text-blue-600">${amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffMealTracking;

import React from 'react';

const SkeletonLoader: React.FC = () => {
    return (
        <div className="w-full space-y-4 animate-pulse p-4">
            <div className="flex items-center space-x-3 mb-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            </div>
            
            <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
            </div>

            <div className="flex items-center justify-center mt-4">
                <span className="text-xs text-gray-400 font-medium tracking-wider uppercase animate-pulse">Generating Insights...</span>
            </div>
        </div>
    );
};

export default SkeletonLoader;

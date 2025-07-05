// MindBoat functional styles and utilities
// These complement the design system from min-d

export const focusBarStyles = {
    container: "relative w-full h-2 bg-gray-200/20 rounded-full overflow-hidden backdrop-blur-sm",
    progress: "absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-teal-400 transition-all duration-500 ease-out",
    pulse: "animate-pulse shadow-lg shadow-blue-400/50",
};

export const timerStyles = {
    container: "flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20",
    digit: "text-2xl font-mono font-bold text-white",
    separator: "text-white/70",
};

export const distractionAlertStyles = {
    container: "fixed top-4 right-4 bg-red-500/90 backdrop-blur-md rounded-lg p-4 border border-red-400/20 shadow-lg",
    urgent: "animate-pulse shadow-lg shadow-red-400/50",
    title: "text-white font-bold text-lg",
    message: "text-white/90 text-sm",
};

export const voyageStatusStyles = {
    container: "flex items-center space-x-3 bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20",
    indicator: "w-3 h-3 rounded-full",
    sailing: "bg-green-400 animate-pulse",
    paused: "bg-yellow-400",
    distracted: "bg-red-400 animate-pulse",
    text: "text-white font-medium",
};

export const oceanOverlayStyles = {
    calm: "bg-gradient-to-b from-blue-400/20 to-teal-400/20",
    choppy: "bg-gradient-to-b from-blue-600/30 to-teal-600/30",
    stormy: "bg-gradient-to-b from-gray-700/40 to-blue-900/40",
    transition: "transition-all duration-2000 ease-in-out",
};

export const seagullAlertStyles = {
    container: "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md rounded-xl p-6 border border-white/30 shadow-xl",
    icon: "text-6xl mb-4 animate-bounce",
    title: "text-2xl font-bold text-gray-800 mb-2",
    message: "text-gray-600 text-center",
};

export const weatherSystemStyles = {
    sunny: "bg-gradient-to-b from-yellow-200/20 to-orange-200/20",
    cloudy: "bg-gradient-to-b from-gray-300/20 to-gray-400/20",
    rainy: "bg-gradient-to-b from-gray-500/30 to-blue-600/30",
    transition: "transition-all duration-3000 ease-in-out",
}; 
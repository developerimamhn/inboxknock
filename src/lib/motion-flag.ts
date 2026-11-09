/**
 * Runs in <head> before paint. Picks one of two comfort modes:
 * "motion" for full animation, "calm" for final states with simple fades.
 * Calm is used for reduced motion, Save-Data, slow networks and low power devices.
 */
export const MOTION_FLAG_SCRIPT = `(function(){var d=document.documentElement,calm=false;try{var n=navigator,c=n.connection;calm=matchMedia('(prefers-reduced-motion: reduce)').matches||!!(c&&(c.saveData||/(^|-)2g$/.test(c.effectiveType||'')))||(n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2);}catch(e){calm=true}d.classList.add('js',calm?'calm':'motion');})();`;

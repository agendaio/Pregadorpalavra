const fs = require('fs');
const content = fs.readFileSync('src/components/assistant/AssistantPage.tsx', 'utf8');
console.log('SPRING_IOS used:', content.includes('SPRING_IOS'));
console.log('EASE_OUT used:', content.includes('EASE_OUT'));
console.log('Motion imported:', content.includes('framer-motion'));
console.log('Menu imported:', content.includes('Menu,'));
// Check all imports from @/lib/motion
const motionIdx = content.indexOf('from \'@/lib/motion\'');
if (motionIdx === -1) {
  console.log('NO motion import found');
} else {
  const snippet = content.substring(motionIdx - 5, motionIdx + 50);
  console.log('Motion import:', JSON.stringify(snippet));
}

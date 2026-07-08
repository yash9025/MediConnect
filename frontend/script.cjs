const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
};

const files = walkSync('src').filter(f => f.endsWith('.js') || f.endsWith('.jsx'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace various auth header injections
  content = content.replace(/,\s*\{\s*headers:\s*\{\s*Authorization:\s*\`Bearer\s*\S+\`\s*\}\s*\}/g, '');
  content = content.replace(/,\s*\{\s*headers:\s*\{\s*token\s*\}\s*\}/g, '');
  
  // Replace MedicalChatBot specific ones
  content = content.replace(/,\s*\{\s*headers:\s*\{\s*token\s*\},\s*signal:\s*controller\.signal\s*\}/g, ', { signal: controller.signal }');
  content = content.replace(/\{\s*headers:\s*\{\s*token\s*\},\s*params:/g, '{ params:');
  
  // AiDiagnostic specific one
  content = content.replace(/,\s*\{\s*headers:\s*\{\s*Authorization:\s*\`Bearer\s*\S+\`,\s*"Content-Type":\s*"multipart\/form-data"\s*\}\s*\}/g, ', { headers: { "Content-Type": "multipart/form-data" } }');
  content = content.replace(/,\s*\{\s*headers:\s*\{\s*Authorization:\s*\`Bearer\s*\S+\`\s*\}\s*\}/g, '');
  content = content.replace(/,\s*\{\s*headers:\s*\{\s*token\s*\}\s*\}/g, '');
  
  if(content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});

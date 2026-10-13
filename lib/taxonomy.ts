import type {Paper} from './types';
export const subfields:Record<string,[string,string]>={
  'virtual-agents':['虚拟环境具身智能体','Virtual embodied agents'], 'physical-reasoning':['物理常识与推理','Physical reasoning'],
  'medical-robotics':['医疗机器人','Medical robotics'], 'autonomous-driving':['自动驾驶与驾驶世界模型','Autonomous driving & driving world models'],
  'aerial-robotics':['空中机器人','Aerial robotics'], 'multi-robot':['多机器人与集群','Multi-robot systems & swarms'], 'slam-localization':['定位与建图','SLAM & localization'], 'continual-learning':['持续学习','Continual learning'],
  'human-robot-interaction':['人机协作','Human–robot interaction'], 'assistive-robotics':['辅助机器人','Assistive robotics'], 'robot-safety':['机器人安全与约束','Robot safety & constraints'],
  'manipulation':['机器人操作','Robot manipulation'], 'robot-data':['机器人与人类示范数据','Robot and human demonstration data'],
  'synthetic-data':['合成数据','Synthetic data'],
  'world-model':['世界模型','World models'], 'video-prediction':['视频预测','Video prediction'],
  'model-based-rl':['基于模型的强化学习','Model-based RL'], 'visual-navigation':['视觉导航','Visual navigation'],
  'spatial-intelligence':['空间智能','Spatial intelligence'], 'humanoid':['人形机器人','Humanoids'],
  'legged-locomotion':['足式运动','Legged locomotion'], 'dexterous-manipulation':['灵巧操作','Dexterous manipulation'],
  'tactile':['触觉感知','Tactile sensing'], 'sim-to-real':['仿真迁移','Sim-to-real'],
  'robot-simulation':['机器人仿真','Robot simulation'], 'reinforcement-learning':['强化学习','Reinforcement learning'],
  'motion-planning':['运动规划','Motion planning'], 'imitation-learning':['模仿学习','Imitation learning'],
  'diffusion':['扩散策略','Diffusion policies'], 'flow-matching':['流匹配','Flow matching'],
  'vla':['视觉语言动作模型','Vision–language–action'], '3d-perception':['三维感知','3D perception'],
  'teleoperation':['遥操作与示范采集','Teleoperation'], 'cross-embodiment':['跨本体学习','Cross-embodiment'],
  'action-tokenization':['动作表示与分词','Action tokenization'], 'language-planning':['语言规划','Language planning'],
};
export function paperSubfields(p:Paper){
  const found=new Set(p.subfields||[]),text=p.tags.join(' ').toLowerCase();
  const rules:[string,RegExp][]=[['diffusion',/diffusion/],['imitation-learning',/imitation|behavior cloning|action chunking/],['flow-matching',/flow matching/],['vla',/\bvla\b/],['3d-perception',/3d|point cloud|voxel|multi.view/],['teleoperation',/teleoperation/],['cross-embodiment',/cross.embodiment|multi.robot/],['action-tokenization',/tokeniz/],['language-planning',/llm planning|language planning/],['world-model',/world model/],['tactile',/tactile|touch/],['reinforcement-learning',/reinforcement/],['sim-to-real',/sim.to.real/]];
  for(const [id,re] of rules)if(re.test(text))found.add(id);return [...found];
}

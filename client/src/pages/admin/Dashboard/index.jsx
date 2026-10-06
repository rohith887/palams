import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, List, ListItem, ListItemAvatar, ListItemText,
  Button, CardHeader, LinearProgress, IconButton, Chip, Skeleton, Tooltip,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar,
  Divider,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle, Error, Launch, Circle as CircleIcon,
  TrendingUp, TrendingDown, TrendingFlat, Refresh,
  Inventory2Outlined, CheckCircleOutline, Autorenew, MoveDown,
  CleaningServices, FactCheckOutlined, VerifiedOutlined, ErrorOutline,
  NotificationsActiveOutlined, Schedule, FiberManualRecord,
  AccessTime, PlayArrow, TaskAlt, Cancel, Pending, Timer,
  Add as AddIcon, Inventory as InventoryIcon, Assessment as AssessmentIcon,
  Security as SecurityIcon, Description as ReportIcon, Dns as DnsIcon,
} from '@mui/icons-material';
import DataTable from '../../../components/common/DataTable';
import StatusChip from '../../../components/common/StatusChip';
import PortalLayout from '../../../components/layout/PortalLayout';
import PageHeader from '../../../components/common/PageHeader';
import useAuth from '../../../hooks/useAuth';
import { useAlertContext } from '../../../contexts/AlertContext';
import dashboardService from '../../../services/dashboardService';

const C={primary:'#0F4C81',success:'#2E7D32',warning:'#EF6C00',error:'#C62828',info:'#1565C0',purple:'#7B1FA2',teal:'#00838F',grey:'#607080'};

function fmtTime(ts){if(!ts)return'\u2014';const d=new Date(ts);return `${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;}
function relativeTime(d){if(!d)return'';const s=Math.round((Date.now()-new Date(d).getTime())/1000);if(s<60)return'just now';if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;}
function fmtDur(m){if(!m&&m!==0)return'\u2014';const h=Math.floor(m/60),r=m%60;return h>0?`${h}h ${r}m`:`${r}m`;}
function secAgo(from){return from?Math.round((Date.now()-new Date(from).getTime())/1000):0;}

// ─── KPI Card Config ───────────────────────────────────────────────────────

const KPI_CONFIG={
  // ─── Row 1: Active Operations ──────────────────────────────────────────
  'Total Active Bins':     {icon:Inventory2Outlined,    color:'#0F4C81',iconBg:'#EBF3FB',subtitle:'Currently active in the system',   path:'/admin/bin-summary'},
  'Loading In Progress':   {icon:Autorenew,             color:'#1565C0',iconBg:'#E8EEF8',subtitle:'Currently being loaded',          path:'/admin/bin-summary?status=Loading_In_Progress'},
  'Unloading In Progress': {icon:MoveDown,              color:'#C25C00',iconBg:'#FDF3EB',subtitle:'Currently being unloaded',        path:'/admin/bin-summary?status=Unloading_In_Progress'},
  'Cleaning In Progress':  {icon:CleaningServices,      color:'#00838F',iconBg:'#E6F4F5',subtitle:'Currently being cleaned',        path:'/admin/bin-summary?status=Cleaning_In_Progress'},
  'QA In Progress':        {icon:FactCheckOutlined,     color:'#6A1EA0',iconBg:'#F4EAF9',subtitle:'Under quality inspection',       path:'/admin/bin-summary?status=QA_In_Progress'},
  // ─── Row 2: Waiting States ────────────────────────────────────────────
  'Awaiting Loading':      {icon:CheckCircleOutline,    color:'#2E7D32',iconBg:'#E8F5E9',subtitle:'Ready for next loading cycle',    path:'/admin/bin-summary?status=Awaiting_Loading'},
  'Awaiting Unloading':    {icon:Schedule,              color:'#EF6C00',iconBg:'#FFF3E0',subtitle:'Waiting for unloading operator',  path:'/admin/bin-summary?status=Awaiting_Unloading'},
  'Awaiting Cleaning':     {icon:Schedule,              color:'#00838F',iconBg:'#E6F4F5',subtitle:'Waiting for cleaning operator',  path:'/admin/bin-summary?status=Awaiting_Cleaning'},
  'Awaiting QA':           {icon:Schedule,              color:'#7B1FA2',iconBg:'#F4EAF9',subtitle:'Waiting for QA inspection',      path:'/admin/bin-summary?status=Awaiting_QA'},
  'QA Failed Today':       {icon:ErrorOutline,          color:'#C62828',iconBg:'#FFEBEE',subtitle:'Failed quality inspections today', path:'/admin/bin-summary?status=QA_Failed,Reinspection_Cleaning'},
};

function TrendBadge({today,yesterday}){
  if(yesterday==null||today==null)return null;
  const diff=today-yesterday;
  if(diff===0)return<Box sx={{display:'inline-flex',alignItems:'center',gap:'2px',px:'5px',py:'1px',borderRadius:'4px',bgcolor:'#F1F3F6'}}><TrendingFlat sx={{fontSize:11,color:'#78909C'}}/><Typography sx={{fontSize:'0.6rem',fontWeight:700,color:'#78909C',lineHeight:1}}>0%</Typography></Box>;
  const pct=yesterday===0?100:Math.abs(Math.round((diff/yesterday)*100));
  const up=diff>0;
  return<Box sx={{display:'inline-flex',alignItems:'center',gap:'2px',px:'5px',py:'1px',borderRadius:'4px',bgcolor:up?'#EBF7EF':'#FDECEC'}}>{up?<TrendingUp sx={{fontSize:11,color:'#1F7A4A'}}/>:<TrendingDown sx={{fontSize:11,color:'#B71C1C'}}/>}<Typography sx={{fontSize:'0.6rem',fontWeight:700,color:up?'#1F7A4A':'#B71C1C',lineHeight:1}}>{pct}%</Typography></Box>;
}

function KpiCard({title,value,yesterday,loading}){
  const cfg=KPI_CONFIG[title]||{};const IconCmp=cfg.icon;
  const showTrend=yesterday!==undefined&&yesterday!==null;
  const cardSx={height:112,borderRadius:'10px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',bgcolor:'#fff',textDecoration:'none',display:'flex',flexDirection:'column',transition:'transform 0.15s, box-shadow 0.15s','&:hover':cfg.path?{transform:'translateY(-2px)',boxShadow:'0 4px 12px rgba(0,0,0,0.10)',cursor:'pointer'}:{}};
  if(loading)return<Card sx={cardSx}><CardContent sx={{p:'12px 14px !important'}}><Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:0.75}}><Skeleton variant="circular" width={32} height={32}/><Skeleton width={32} height={16} sx={{borderRadius:'4px'}}/></Box><Skeleton width="50%" height={30} sx={{mb:0.5}}/><Skeleton width="65%" height={11}/></CardContent></Card>;
  return<Card component={cfg.path?Link:'div'} to={cfg.path} sx={cardSx}><CardContent sx={{p:'12px 14px 10px !important',flexGrow:1,display:'flex',flexDirection:'column'}}><Box sx={{display:'flex',alignItems:'center',gap:'8px',mb:'6px'}}><Box sx={{width:32,height:32,borderRadius:'50%',flexShrink:0,bgcolor:cfg.iconBg||'#F1F3F6',display:'flex',alignItems:'center',justifyContent:'center'}}>{IconCmp&&<IconCmp sx={{fontSize:16,color:cfg.color||'#4A5568'}}/>}</Box><Typography sx={{fontSize:'0.68rem',fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.04em',lineHeight:1.2,flexGrow:1}}>{title}</Typography>{showTrend&&<Tooltip title="vs yesterday"><Box><TrendBadge today={value} yesterday={yesterday}/></Box></Tooltip>}</Box><Typography sx={{fontSize:'2rem',fontWeight:800,color:cfg.color||'#111827',lineHeight:1,mb:'4px',letterSpacing:'-0.02em'}}>{value??0}</Typography><Typography sx={{fontSize:'0.68rem',color:'#9CA3AF',lineHeight:1}}>{cfg.subtitle}</Typography></CardContent></Card>;
}

  function DashboardCard({title,subtitle,action,children,sx}){return<Card sx={{borderRadius:2,height:'100%',display:'flex',flexDirection:'column',...sx}}><CardHeader title={<Typography sx={{fontSize:'0.8125rem',fontWeight:700,color:C.primary}}>{title}</Typography>} subheader={subtitle?<Typography sx={{fontSize:'0.7rem',color:C.grey,mt:0.1}}>{subtitle}</Typography>:null} action={action} sx={{pb:0,px:2,pt:1.5,'& .MuiCardHeader-action':{mt:0,alignSelf:'center'}}}/><CardContent sx={{flexGrow:1,overflow:'auto',px:1.5,pt:1,pb:'12px !important'}}>{children}</CardContent></Card>;}


const STATUS_COLORS={loading:'info',cleaning:'teal',qa:'purple',unloading:'warning'};

function PlantBanner({kpis,alerts,loading}){
  const liveCount=(kpis.loading_in_progress||0)+(kpis.unloading_in_progress||0)+(kpis.cleaning_in_progress||0)+(kpis.qa_in_progress||0);
  const critCount=alerts.filter(a=>a.Severity==='Critical').length;
  const status=loading?'loading':critCount>0?'warning':kpis.total_active_bins>0?'success':'warning';
  const statusLabel=loading?'Initializing...':critCount>0?'⚠ Attention Required':liveCount>0?'● Plant Operational':'○ Plant Idle';
  const statusColor=loading?C.grey:critCount>0?C.warning:C.success;
  return(
    <Paper sx={{mb:2,px:2,py:1.25,borderRadius:2,border:'1px solid #E5E7EB',display:'flex',alignItems:'center',gap:1.5,flexWrap:'wrap',bgcolor:'#FAFBFC'}}>
      <Box sx={{display:'flex',alignItems:'center',gap:0.75}}>
        <FiberManualRecord sx={{fontSize:10,color:statusColor,animation:status==='success'&&!loading?'pulse 2s infinite':''}}/>
        <Typography sx={{fontSize:'0.75rem',fontWeight:700,color:statusColor}}>{statusLabel}</Typography>
      </Box>
      <Divider orientation="vertical" flexItem/>
      <Typography variant="caption" color="text.secondary" sx={{fontSize:'0.62rem'}}>{kpis.total_active_bins||0} Active Bins · {liveCount} Live Ops · {critCount} Critical Alerts</Typography>
      <Box sx={{flex:1}}/>
      <Typography variant="caption" color="text.secondary" sx={{fontSize:'0.6rem'}}>QA Pass: {kpis.qa_pass_rate_today||0}%</Typography>
      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}'}</style>
    </Paper>
  );
}

// ─── Live Operations ───────────────────────────────────────────────────────

const OP_COLORS={Loading:C.info,'Cleaning (Reinspection)':C.teal,Cleaning:C.teal,Unloading:C.warning,QA:C.purple};

function LiveOperations({ops,loading}){
  const nav=useNavigate();
  const statusMap={'Loading':'Loading_In_Progress','Unloading':'Unloading_In_Progress','Cleaning':'Cleaning_In_Progress','QA':'QA_In_Progress','Cleaning (Reinspection)':'Reinspection_Cleaning'};
  const columns=useMemo(()=>[
    {key:'Bin_Number',label:'Bin Number',minWidth:120,sortable:true,render:(r)=><Typography variant="caption" sx={{fontFamily:'monospace',fontSize:'0.75rem',fontWeight:600,color:'primary.main','&:hover':{textDecoration:'underline',cursor:'pointer'}}}>{r.Bin_Number}</Typography>},
    {key:'Current_Operation',label:'Operation',minWidth:140,sortable:true,render:(r)=>{const c=OP_COLORS[r.Current_Operation]||C.info;return<Chip label={r.Current_Operation} size="small" sx={{height:22,fontSize:'0.7rem',fontWeight:600,bgcolor:`${c}18`,color:c}}/>;}},
    {key:'Status',label:'Status',minWidth:160,sortable:true,render:(r)=><StatusChip status={statusMap[r.Current_Operation]||r.Current_Operation}/>},
    {key:'Operator',label:'Operator',minWidth:140,render:(r)=>r.Operator||'\u2014'},
    {key:'Started_At',label:'Started At',minWidth:140,sortable:true,render:(r)=><Typography variant="caption" sx={{fontFamily:'monospace',fontSize:'0.7rem'}}>{fmtTime(r.Started_At)}</Typography>},
    {key:'Duration',label:'Elapsed',minWidth:90,sortable:true,render:(r)=><Typography variant="caption" sx={{fontFamily:'monospace',fontWeight:600,fontSize:'0.7rem'}}>{fmtDur(r.Duration_Minutes)}</Typography>},
    {key:'Progress',label:'Progress',minWidth:130,render:()=><Box sx={{display:'flex',alignItems:'center',gap:0.75}}><LinearProgress sx={{width:60,height:4,borderRadius:2}}/><Typography variant="caption" sx={{fontSize:'0.65rem',color:C.grey}}>In Progress</Typography></Box>},
  ],[]);
  const rows=useMemo(()=>{
    if(!ops)return[];
    return[...ops].filter(op=>OP_COLORS[op.Current_Operation]).sort((a,b)=>new Date(b.Started_At)-new Date(a.Started_At)).slice(0,10);
  },[ops]);
  return(
    <DashboardCard title="Live Operations" subtitle={ops.length>0?`${ops.length} bins in progress`:null} action={<Button component={Link} to="/admin/bin-summary" endIcon={<Launch sx={{fontSize:12}}/>} size="small" sx={{fontSize:'0.7rem',minHeight:28}}>View All</Button>}>
      {loading?Array.from({length:3}).map((_,i)=><Skeleton key={i} width="100%" height={48} sx={{mb:0.5,borderRadius:1}}/>):rows.length===0?(
        <Box sx={{textAlign:'center',py:3}}><PlayArrow sx={{color:'success.main',fontSize:28,mb:0.5}}/><Typography sx={{fontSize:'0.75rem',color:C.grey}}>No active operations</Typography><Typography variant="caption" color="text.secondary">All bins are currently idle.</Typography></Box>
      ):(
        <DataTable columns={columns} rows={rows} keyField="Bin_ID" size="small" onRowClick={(r)=>nav(`/admin/audit/bin-history?binNumber=${r.Bin_Number}`)} sx={{boxShadow:'none',border:'none','& .MuiPaper-root':{boxShadow:'none',border:'none'},'& .MuiTableCell-head':{bgcolor:'#F5F6FA',fontSize:'0.7rem'}}}/>
      )}
    </DashboardCard>
  );
}

// ─── Work Queue (replaces Today's Performance) ────────────────────────────

function WorkQueue({kpis,loading}){
  const items=[
    {label:'Awaiting Loading',value:kpis.awaiting_loading||0,color:C.info,icon:Autorenew,path:'/admin/bin-summary?status=Awaiting_Loading'},
    {label:'Awaiting Unloading',value:kpis.awaiting_unloading||0,color:C.warning,icon:MoveDown,path:'/admin/bin-summary?status=Awaiting_Unloading'},
    {label:'Awaiting Cleaning',value:kpis.awaiting_cleaning||0,color:C.teal,icon:CleaningServices,path:'/admin/bin-summary?status=Awaiting_Cleaning'},
    {label:'Awaiting QA',value:kpis.awaiting_qa||0,color:C.purple,icon:FactCheckOutlined,path:'/admin/bin-summary?status=Awaiting_QA'},
    {label:'Admin Review',value:kpis.admin_review_bins||0,color:C.warning,icon:Error,path:'/admin/bin-summary?status=QA_Failed'},
    {label:'Reinspection',value:kpis.reinspection_cleaning||0,color:C.error,icon:ErrorOutline,path:'/admin/bin-summary?status=Reinspection_Cleaning'},
  ];
  return(
    <DashboardCard title="Work Queue" subtitle="Pending operational stages">
      {loading?Array.from({length:6}).map((_,i)=><Skeleton key={i} width="100%" height={40} sx={{mb:0.5,borderRadius:1}}/>):(
        items.map(it=>(<Box key={it.label} component={Link} to={it.path} sx={{display:'flex',alignItems:'center',py:0.6,px:0.75,textDecoration:'none',color:'inherit',borderRadius:1,transition:'background 0.15s','&:hover':{bgcolor:'#F0F4F8'}}}><Box sx={{width:28,height:28,borderRadius:'50%',bgcolor:`${it.color}15`,display:'flex',alignItems:'center',justifyContent:'center',mr:1}}><it.icon sx={{fontSize:14,color:it.color}}/></Box><Typography sx={{fontSize:'0.7rem',flexGrow:1}}>{it.label}</Typography><Typography sx={{fontSize:'0.75rem',fontWeight:700,color:it.color}}>{it.value}</Typography></Box>))
      )}
    </DashboardCard>
  );
}

// ─── Workflow Doughnut ─────────────────────────────────────────────────────

function WorkflowDoughnut({kpis,loading}){
  const sections=[
    {label:'Loading',value:kpis.loading_in_progress||0,color:C.info},
    {label:'Unloading',value:kpis.unloading_in_progress||0,color:C.warning},
    {label:'Cleaning',value:kpis.cleaning_in_progress||0,color:C.teal},
    {label:'QA',value:kpis.qa_in_progress||0,color:C.purple},
    {label:'Completed',value:kpis.completed_today||0,color:C.success},
    {label:'Rejected',value:kpis.rejected_today||0,color:C.error},
  ];
  const total=Math.max(sections.reduce((s,i)=>s+i.value,0),1);
  let cumulative=0;
  const segments=sections.filter(s=>s.value>0).map(s=>{
    const start=cumulative;cumulative+=s.value;const offset=(start/total)*360;
    const pct=Math.round(s.value/total*100);
    return{...s,pct,offset};
  });
  return(
    <DashboardCard title="Workflow Distribution" subtitle="Current operational state">
      {loading?<Skeleton variant="circular" width={140} height={140} sx={{mx:'auto'}}/>:(
        <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',gap:2,flexWrap:'wrap'}}>
          <Box sx={{position:'relative',width:140,height:140}}>
            {segments.map((s,i)=>(
              <Box key={s.label} sx={{position:'absolute',width:'100%',height:'100%',borderRadius:'50%',clipPath:`polygon(50% 50%,${50+50*Math.cos((s.offset-90)*Math.PI/180)}% ${50+50*Math.sin((s.offset-90)*Math.PI/180)}%,${50+50*Math.cos((s.offset-90+(s.value/total)*360)*Math.PI/180)}% ${50+50*Math.sin((s.offset-90+(s.value/total)*360)*Math.PI/180)}%)`,bgcolor:s.color,opacity:0.85}}/>
            ))}
            <Box sx={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',borderRadius:'50%',bgcolor:'#fff',width:70,height:70,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><Typography sx={{fontSize:'0.9rem',fontWeight:800,color:C.primary}}>{total}</Typography><Typography variant="caption" sx={{fontSize:'0.5rem',color:C.grey}}>TOTAL</Typography></Box>
          </Box>
          <Box sx={{display:'flex',flexDirection:'column',gap:0.5}}>
            {segments.map(s=>(<Box key={s.label} sx={{display:'flex',alignItems:'center',gap:0.5}}><Box sx={{width:8,height:8,borderRadius:1,bgcolor:s.color}}/><Typography variant="caption" sx={{fontSize:'0.6rem'}}>{s.label} <strong>{s.pct}%</strong></Typography></Box>))}
          </Box>
        </Box>
      )}
    </DashboardCard>
  );
}

// ─── Activity Timeline ─────────────────────────────────────────────────────

function ActivityTimeline({activities,loading}){
  const nav=useNavigate();
  const icons={COMPLETE_LOADING:<TaskAlt sx={{color:C.info}}/>,START_LOADING:<PlayArrow sx={{color:C.info}}/>,COMPLETE_UNLOADING:<TaskAlt sx={{color:C.warning}}/>,QA_PASSED:<VerifiedOutlined sx={{color:C.success}}/>,QA_FAILED:<Cancel sx={{color:C.error}}/>,START_CLEANING:<CleaningServices sx={{color:C.teal}}/>,COMPLETE_CLEANING:<TaskAlt sx={{color:C.teal}}/>,START_QA:<FactCheckOutlined sx={{color:C.purple}}/>};
  return(
    <DashboardCard title="Activity Feed" action={<Button component={Link} to="/admin/audit/log" endIcon={<Launch sx={{fontSize:12}}/>} size="small" sx={{fontSize:'0.7rem',minHeight:28}}>View All</Button>}>
      {loading?Array.from({length:5}).map((_,i)=><Skeleton key={i} width="100%" height={36} sx={{mb:0.5,borderRadius:1}}/>):activities.length===0?(
        <Box sx={{textAlign:'center',py:3}}><AccessTime sx={{color:'text.disabled',fontSize:28,mb:0.5}}/><Typography sx={{fontSize:'0.75rem',color:C.grey}}>No recent activity</Typography><Typography variant="caption" color="text.secondary">Operations will appear here</Typography></Box>
      ):(
        <Box sx={{display:'flex',flexDirection:'column',gap:0.25,maxHeight:340,overflowY:'auto'}}>
          {activities.slice(0,10).map((a,i)=>(<Box key={a.Audit_ID||i} sx={{display:'flex',alignItems:'center',gap:1,py:0.5,px:0.5,borderRadius:1,cursor:'pointer',transition:'background 0.1s','&:hover':{bgcolor:'#F0F4F8'}}} onClick={()=>nav('/admin/audit/log')}>
            <Box sx={{width:28,height:28,borderRadius:'50%',bgcolor:'#F5F7FA',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icons[a.Action_Type]||<CircleIcon sx={{fontSize:10,color:C.grey}}/>}</Box>
            <Box sx={{flexGrow:1,minWidth:0}}><Typography variant="caption" sx={{fontSize:'0.68rem',fontWeight:500}}>{(a.Action_Type||'').replace(/_/g,' ')}</Typography><Typography variant="caption" sx={{display:'block',fontSize:'0.6rem',color:C.grey}}>{a.Actor_Name||'System'}</Typography></Box>
            <Tooltip title={a.Event_Timestamp?new Date(a.Event_Timestamp).toLocaleTimeString():''}><Typography variant="caption" sx={{fontSize:'0.58rem',color:C.grey,flexShrink:0}}>{relativeTime(a.Event_Timestamp)}</Typography></Tooltip>
          </Box>))}
        </Box>
      )}
    </DashboardCard>
  );
}

// ─── Alerts Compact ────────────────────────────────────────────────────────

function AlertsCompact({alerts,loading}){
  const counts=useMemo(()=>{
    const c={critical:0,high:0,medium:0,low:0};
    alerts.forEach(a=>{if(a.Severity==='Critical')c.critical++;else if(a.Severity==='High'||a.Severity==='Warning')c.high++;else if(a.Severity==='Medium')c.medium++;else c.low++;});
    return c;
  },[alerts]);
  const sevChips=[
    {label:'Critical',value:counts.critical,color:'error',bg:'#FFEBEE'},
    {label:'High',value:counts.high,color:'warning',bg:'#FFF3E0'},
    {label:'Medium',value:counts.medium,color:'info',bg:'#E3F0FF'},
    {label:'Low',value:counts.low,color:'default',bg:'#F5F5F5'},
  ];
  return(
    <DashboardCard title="Alerts" subtitle={alerts.length>0?`${alerts.length} unacknowledged`:'System Healthy'} action={<Button component={Link} to="/admin/alerts" size="small" sx={{fontSize:'0.7rem',minHeight:28}}>View All</Button>}>
      {loading?Array.from({length:3}).map((_,i)=><Skeleton key={i} width="100%" height={28} sx={{mb:0.5,borderRadius:1}}/>):alerts.length===0?(
        <Box sx={{textAlign:'center',py:2}}><CheckCircle sx={{color:'success.main',fontSize:22,mb:0.25}}/><Typography sx={{fontSize:'0.72rem',fontWeight:600,color:C.success}}>System Healthy</Typography><Typography variant="caption" color="text.secondary">No pending incidents</Typography></Box>
      ):(
        <>
          <Grid container spacing={0.5} sx={{mb:1}}>{sevChips.map(s=>(<Grid item xs={3} key={s.label}><Paper sx={{p:0.75,textAlign:'center',bgcolor:s.bg,borderRadius:1}}><Typography sx={{fontSize:'0.85rem',fontWeight:800,color:s.color==='error'?C.error:s.color==='warning'?C.warning:C.info}}>{s.value}</Typography><Typography variant="caption" sx={{fontSize:'0.48rem',color:C.grey,display:'block'}}>{s.label}</Typography></Paper></Grid>))}</Grid>
          <Box sx={{maxHeight:180,overflowY:'auto'}}>{alerts.slice(0,4).map(a=>(<Box key={a.Alert_ID} component={Link} to="/admin/alerts" sx={{display:'block',py:0.5,px:0.5,borderRadius:1,textDecoration:'none',color:'inherit',mb:0.25,'&:hover':{bgcolor:'#F0F4F8'}}}><Typography variant="caption" sx={{fontSize:'0.65rem',fontWeight:500}}>{(a.Alert_Type||'').replace(/_/g,' ')}</Typography>{a.Bin_Number&&<Typography variant="caption" sx={{fontSize:'0.6rem',color:C.grey,ml:0.5}}>Bin {a.Bin_Number}</Typography>}</Box>))}</Box>
        </>
      )}
    </DashboardCard>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────

const QUICK_ACTIONS=[
  {title:'Register Bin',icon:<AddIcon/>,path:'/admin/bins/create'},
  {title:'Bin Master',icon:<InventoryIcon/>,path:'/admin/bins'},
  {title:'Bin Summary',icon:<AssessmentIcon/>,path:'/admin/bin-summary'},
  {title:'Audit Trail',icon:<SecurityIcon/>,path:'/admin/audit/log'},
  {title:'Reports',icon:<ReportIcon/>,path:'/admin/reports'},
  {title:'System Logs',icon:<DnsIcon/>,path:'/admin/system-logs'},
];

function QuickActions(){return<DashboardCard title="Quick Actions"><Grid container spacing={1.25}>{QUICK_ACTIONS.map(a=>(<Grid item xs={6} key={a.title}><Button component={Link} to={a.path} variant="outlined" sx={{flexDirection:'column',height:72,width:'100%',borderRadius:2,gap:0.5,borderColor:'#D8E2EC',color:C.grey,fontSize:'0.68rem',fontWeight:600,'&:hover':{transform:'translateY(-2px)',bgcolor:'#EBF3FC',borderColor:C.primary,color:C.primary},'& svg':{fontSize:'1.1rem'}}}>{a.icon}{a.title}</Button></Grid>))}</Grid></DashboardCard>;}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AdminDashboard(){
  const {user,logout}=useAuth();
  const {alerts:ctxAlerts}=useAlertContext();
  const [data,setData]=useState(null);const [liveOps,setLiveOps]=useState([]);
  const [loading,setLoading]=useState(true);const [lastRefresh,setLastRefresh]=useState(null);
  const [refreshSec,setRefreshSec]=useState(0);const [fetchError,setFetchError]=useState(null);

  const fetchDashboard=useCallback(async()=>{
    setFetchError(null);
    try{
      const[res,opsRes]=await Promise.all([dashboardService.getAdminDashboard(),dashboardService.getLiveOperations().catch(()=>({data:{data:[]}}))]);
      setData(res.data?.data??null);setLiveOps(opsRes.data?.data??[]);setLastRefresh(new Date());setRefreshSec(0);
    }catch{setFetchError('Dashboard data unavailable. Will retry automatically.');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchDashboard();const id=setInterval(fetchDashboard,60000);return()=>clearInterval(id);},[fetchDashboard]);
  useEffect(()=>{const t=setInterval(()=>setRefreshSec(s=>s+1),1000);return()=>clearInterval(t);},[]);

  const kpis=data?.kpis??{};const activity=data?.recentActivity??[];
  const alerts=(data?.alerts?.length??0)>0?data.alerts:(ctxAlerts??[]);

  const kpiCards=[
    {title:'Total Active Bins',     value:kpis.total_active_bins,                                    yesterday:undefined},
    {title:'Loading In Progress',   value:kpis.loading_in_progress||0,                               yesterday:undefined},
    {title:'Unloading In Progress', value:kpis.unloading_in_progress||0,                             yesterday:undefined},
    {title:'Cleaning In Progress',  value:kpis.cleaning_in_progress||0,                              yesterday:undefined},
    {title:'QA In Progress',        value:kpis.qa_in_progress||0,                                    yesterday:undefined},
    {title:'Awaiting Loading',      value:kpis.awaiting_loading||0,                                  yesterday:undefined},
    {title:'Awaiting Unloading',    value:kpis.awaiting_unloading||0,                                yesterday:undefined},
    {title:'Awaiting Cleaning',     value:kpis.awaiting_cleaning||0,                                 yesterday:undefined},
    {title:'Awaiting QA',           value:kpis.awaiting_qa||0,                                       yesterday:undefined},
    {title:'QA Failed Today',       value:(kpis.admin_review_bins||0)+(kpis.reinspection_cleaning||0), yesterday:undefined},
  ];

  return(
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{  p: { xs: 2, md: 3 },  bgcolor: '#F5F7FA',   height: '100%', }}>
        {/* Header */}
<Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 1,
    flexWrap: 'wrap',
    gap: 1,
  }}
>
  <Typography variant="h4">
    Dashboard
  </Typography>

  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {lastRefresh && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <FiberManualRecord
          sx={{
            fontSize: 8,
            color: C.success,
            animation: 'pulse 2s infinite',
          }}
        />
        <Typography sx={{ fontSize: '0.62rem', color: C.grey }}>
          Live · {refreshSec < 60 ? `${refreshSec}s ago` : `${Math.floor(refreshSec / 60)}m ago`}
        </Typography>
      </Box>
    )}

    <Tooltip title="Refresh now">
      <span>
        <IconButton
          size="small"
          onClick={fetchDashboard}
          disabled={loading}
          sx={{
            bgcolor: '#fff',
            border: '1px solid #D8E2EC',
          }}
        >
          <Refresh sx={{ fontSize: 15 }} />
        </IconButton>
      </span>
    </Tooltip>
  </Box>
</Box>

        {/* Plant Status Banner */}
        <PlantBanner kpis={kpis} alerts={alerts} loading={loading}/>

        {fetchError&&(<Box sx={{mb:2,px:2,py:1.25,bgcolor:'#FFEBEE',borderRadius:2,border:'1px solid #FFCDD2',display:'flex',alignItems:'center',gap:1}}><Error sx={{fontSize:15,color:C.error}}/><Typography sx={{fontSize:'0.75rem',color:C.error}}>{fetchError}</Typography></Box>)}

        <Grid container spacing={1.5}>
          {/* Row 1: KPI Cards */}
          {kpiCards.map(k=>(<Grid item xs={12} sm={6} md={4} lg={2.4} key={k.title}><KpiCard title={k.title} value={k.value} yesterday={k.yesterday} loading={loading}/></Grid>))}

          {/* Row 2: Plant Status Banner removed from grid — already above */}

          {/* Row 2: Live Operations */}
          <Grid item xs={12}><LiveOperations ops={liveOps} loading={loading}/></Grid>

          {/* Row 3: Work Queue | Workflow Doughnut | Alerts */}
          <Grid item xs={12} md={4} lg={3}><WorkQueue kpis={kpis} loading={loading}/></Grid>
          <Grid item xs={12} md={8} lg={6}><WorkflowDoughnut kpis={kpis} loading={loading}/></Grid>
          <Grid item xs={12} md={12} lg={3}><AlertsCompact alerts={alerts} loading={loading}/></Grid>

          {/* Row 4: Activity Timeline | Quick Actions */}
          <Grid item xs={12} lg={9}><ActivityTimeline activities={activity} loading={loading}/></Grid>
          <Grid item xs={12} lg={3}><QuickActions/></Grid>
        </Grid>
      </Box>
    </PortalLayout>
  );
}
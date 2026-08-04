// Supabase Connection Settings
const SUPABASE_URL = 'https://wetmaleisdvyzazutyum.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eCpK_nKqNxbBCeFhwO8IFw_hyRq6YoN';


let supabaseClient = null;

// Initialize Supabase Client if keys are provided
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Global Error Handler for debugging
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[Frontend Error]', message, 'at', source, lineno);
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('[Unhandled Rejection]', event.reason);
};

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let currentUser = null;
  try {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && savedUser !== 'undefined') {
      currentUser = JSON.parse(savedUser);
    }
  } catch (e) {
    console.error('LocalStorage parsing failed:', e);
    localStorage.removeItem('currentUser');
  }
  
  let adminToken = sessionStorage.getItem('adminToken') || null;
  let currentClientIp = '127.0.0.1';
  let activeTab = 'tab-records';
  let attendanceRecords = []; // Temporary store for excel export

  // --- UI ELEMENTS ---
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const adminSection = document.getElementById('admin-section');
  
  const adminEntryBtn = document.getElementById('admin-entry-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const footerClientIp = document.getElementById('footer-client-ip');
  
  const loginForm = document.getElementById('login-form');
  const empNameInput = document.getElementById('emp-name');
  const empIdInput = document.getElementById('emp-id');
  
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayId = document.getElementById('user-display-id');
  const checkInBtn = document.getElementById('check-in-btn');
  
  const liveDate = document.getElementById('live-date');
  const liveTime = document.getElementById('live-time');
  
  const adminAuthBox = document.getElementById('admin-auth-box');
  const adminPasswordInput = document.getElementById('admin-password-input');
  const adminLoginSubmit = document.getElementById('admin-login-submit');
  const adminAuthError = document.getElementById('admin-auth-error');
  const adminMainContent = document.getElementById('admin-main-content');
  const adminCloseBtn = document.getElementById('admin-close-btn');
  
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  const filterStartDate = document.getElementById('filter-start-date');
  const filterEndDate = document.getElementById('filter-end-date');
  const filterEmpName = document.getElementById('filter-emp-name');
  const btnSearchRecords = document.getElementById('btn-search-records');


  const btnResetFilters = document.getElementById('btn-reset-filters');
  const btnExportExcel = document.getElementById('btn-export-excel');
  const attendanceTableBody = document.getElementById('attendance-table-body');
  const noRecordsMsg = document.getElementById('no-records-msg');
  
  const newEmployeeForm = document.getElementById('new-employee-form');
  const newEmpName = document.getElementById('new-emp-name');
  const newEmpId = document.getElementById('new-emp-id');
  const employeeTableBody = document.getElementById('employee-table-body');
  
  const settingIpToggle = document.getElementById('setting-ip-toggle');
  const settingAllowedIps = document.getElementById('setting-allowed-ips');
  const currentDetectedIp = document.getElementById('current-detected-ip');
  const settingNewPassword = document.getElementById('setting-new-password');
  const settingNewPasswordConfirm = document.getElementById('setting-new-password-confirm');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  const resultModal = document.getElementById('result-modal');
  const modalStatusIcon = document.getElementById('modal-status-icon');
  const modalTitle = document.getElementById('modal-title');
  const resName = document.getElementById('res-name');
  const resShift = document.getElementById('res-shift');
  const resTime = document.getElementById('res-time');
  const resLateBadge = document.getElementById('res-late-badge');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMsg = document.getElementById('toast-msg');

  // Admin Attendance CRUD elements
  const btnAddRecordModal = document.getElementById('btn-add-record-modal');
  const adminRecordModal = document.getElementById('admin-record-modal');
  const adminModalTitle = document.getElementById('admin-modal-title');
  const adminModalEmpSelect = document.getElementById('admin-modal-emp-select');
  const adminModalTime = document.getElementById('admin-modal-time');
  const adminModalShift = document.getElementById('admin-modal-shift');
  const adminModalReasonGroup = document.getElementById('admin-modal-reason-group');
  const adminModalReason = document.getElementById('admin-modal-reason');
  const btnAdminModalCancel = document.getElementById('btn-admin-modal-cancel');
  const btnAdminModalSave = document.getElementById('btn-admin-modal-save');

  let editingRecordId = null; // 수정 중인 기록 ID (null 이면 추가 모드)


  // Personal history navigation and elements
  const userTabsNav = document.getElementById('user-tabs-nav');
  const userTabButtons = document.querySelectorAll('.user-tab-btn');
  const userTabContents = document.querySelectorAll('.user-tab-content');
  const myFilterStartDate = document.getElementById('my-filter-start-date');
  const myFilterEndDate = document.getElementById('my-filter-end-date');
  const btnSearchMyRecords = document.getElementById('btn-search-my-records');
  const btnResetMyFilters = document.getElementById('btn-reset-my-filters');
  const btnExportMyExcel = document.getElementById('btn-export-my-excel');
  const myHistoryTableBody = document.getElementById('my-history-table-body');
  const myHistoryNoRecordsMsg = document.getElementById('my-history-no-records-msg');

  let myHistoryRecords = []; // Store fetched personal logs



  // --- INITIALIZATION ---
  initApp();

  function initApp() {
    startClock();
    fetchClientIp();

    // Check if configuration is missing
    if (!supabaseClient) {
      alert("⚠️ Supabase 설정 정보가 유실되었습니다.\n\njs/app.js 파일 상단에 발급받으신 SUPABASE_URL과 SUPABASE_ANON_KEY를 올바르게 기입해 주세요.");
      return;
    }

    if (currentUser) {
      showDashboard();
    } else {
      showLogin();
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const today = now.toISOString().split('T')[0];
    
    filterStartDate.value = firstDay;
    filterEndDate.value = today;

    myFilterStartDate.value = firstDay;
    myFilterEndDate.value = today;
  }



  // --- VIEW ROUTING ---
  function showLogin() {
    loginSection.classList.add('active');
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    dashboardSection.classList.remove('active');
    adminSection.classList.add('hidden');
    adminSection.classList.remove('active');
    
    logoutBtn.classList.add('hidden');
    adminEntryBtn.classList.remove('hidden');
  }

  function showDashboard() {
    userDisplayName.textContent = currentUser.name;
    userDisplayId.textContent = currentUser.employee_id;

    dashboardSection.classList.add('active');
    dashboardSection.classList.remove('hidden');
    loginSection.classList.add('hidden');
    loginSection.classList.remove('active');
    adminSection.classList.add('hidden');
    adminSection.classList.remove('active');
    
    logoutBtn.classList.remove('hidden');
    adminEntryBtn.classList.remove('hidden');

    // 탭 상태 초기화 (출근 등록 탭을 기본값으로 활성화)
    userTabButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-user-tab="checkin"]').classList.add('active');
    userTabContents.forEach(c => {
      if (c.id === 'user-tab-checkin') {
        c.classList.add('active');
        c.classList.remove('hidden');
      } else {
        c.classList.add('hidden');
        c.classList.remove('active');
      }
    });
  }



  function showAdminPanel() {
    loginSection.classList.add('hidden');
    loginSection.classList.remove('active');
    dashboardSection.classList.add('hidden');
    dashboardSection.classList.remove('active');
    adminSection.classList.add('active');
    adminSection.classList.remove('hidden');

    if (adminToken) {
      adminAuthBox.classList.add('hidden');
      adminMainContent.classList.remove('hidden');
      loadAdminData();
    } else {
      adminAuthBox.classList.remove('hidden');
      adminMainContent.classList.add('hidden');
      adminPasswordInput.focus();
    }
  }

  // --- TOAST NOTIFICATION ---
  function showToast(message, type = 'info') {
    toastMsg.textContent = message;
    toastIcon.className = 'fa-solid';
    
    if (type === 'success') {
      toastIcon.classList.add('fa-circle-check');
      toastIcon.style.color = 'var(--color-success)';
    } else if (type === 'error') {
      toastIcon.classList.add('fa-circle-exclamation');
      toastIcon.style.color = 'var(--color-danger)';
    } else {
      toastIcon.classList.add('fa-circle-info');
      toastIcon.style.color = 'var(--color-primary)';
    }

    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  // --- CLOCK & TIMING SERVICES ---
  function startClock() {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const dayList = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const day = dayList[now.getDay()];
      
      liveDate.textContent = `${year}년 ${month}월 ${date}일 ${day}`;
      
      const pad = (n) => String(n).padStart(2, '0');
      liveTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    };
    
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Get Verified standard network time to prevent local device time cheat
  async function getVerifiedTime() {
    try {
      // Fetch Seoul time from WorldTimeAPI
      const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Seoul');
      if (!res.ok) throw new Error('Network time fetch error');
      const data = await res.json();
      return new Date(data.datetime);
    } catch (err) {
      console.warn('인터넷 표준시를 호출하지 못했습니다. 기기 시간을 사용합니다.', err);
      return new Date();
    }
  }

  // --- CLIENT IP DETECTION ---
  async function fetchClientIp() {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      currentClientIp = data.ip;
      footerClientIp.textContent = data.ip;
      currentDetectedIp.textContent = data.ip;
    } catch (err) {
      console.error('공인 IP 조회 실패:', err);
      currentClientIp = '127.0.0.1';
      footerClientIp.textContent = '조회 불가';
      currentDetectedIp.textContent = '조회 불가';
    }
  }

  // --- LATE STATUS CHECK LOGIC ---
  function checkLateStatus(shiftType, currentTime) {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    
    const currentMinutes = hours * 60 + minutes;
    
    const pad = (n) => String(n).padStart(2, '0');
    const year = currentTime.getFullYear();
    const month = pad(currentTime.getMonth() + 1);
    const date = pad(currentTime.getDate());
    const checkInTimeStr = `${year}-${month}-${date} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    let limitMinutes = 0;
    let limitTimeStr = '';

    switch (shiftType) {
      case '주간':
        limitMinutes = 7 * 60 + 0; // 07:00
        limitTimeStr = '07:00';
        break;
      case '일반':
        limitMinutes = 9 * 60 + 30; // 09:30
        limitTimeStr = '09:30';
        break;
      case '오후':
        limitMinutes = 12 * 60 + 30; // 12:30
        limitTimeStr = '12:30';
        break;
      case '야간':
        limitMinutes = 21 * 60 + 15; // 21:15
        limitTimeStr = '21:15';
        break;
      default:
        limitMinutes = 9 * 60 + 30;
        limitTimeStr = '09:30';
    }

    // 4 minutes 59 seconds grace period: Late if currentMinutes is greater than or equal to (limitMinutes + 5)
    const isLate = currentMinutes >= (limitMinutes + 5);

    return {


      isLate,
      checkInTimeStr,
      limitTimeStr
    };
  }

  // --- API CALLS: AUTH & CHECK-IN (SUPABASE PORT) ---
  
  // 1. Employee Login (Fetch from Supabase)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = empNameInput.value.trim();
    const employeeId = empIdInput.value.trim();

    if (!name || !employeeId) return;

    try {
      // Find employee in Supabase
      const { data: employee, error } = await supabaseClient
        .from('employees')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('name', name)
        .maybeSingle();

      if (error) throw error;

      if (!employee) {
        // Check if employee ID is already used by someone else
        const { data: idExists, error: existError } = await supabaseClient
          .from('employees')
          .select('employee_id')
          .eq('employee_id', employeeId)
          .maybeSingle();

        if (existError) throw existError;

        if (idExists) {
          showToast('이미 등록된 사번입니다. 이름이 일치하지 않습니다.', 'error');
          return;
        }

        // Auto-Register new employee
        const { data: newEmployee, error: regError } = await supabaseClient
          .from('employees')
          .insert([{ employee_id: employeeId, name: name }])
          .select()
          .single();

        if (regError) throw regError;
        
        currentUser = newEmployee;
        showToast('신규 직원으로 자동 등록되었습니다.', 'success');
      } else {
        currentUser = employee;
      }

      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showDashboard();
      showToast('로그인되었습니다.', 'success');
      empNameInput.value = '';
      empIdInput.value = '';
    } catch (err) {
      console.error(err);
      showToast('로그인 중 서버 통신 오류가 발생했습니다.', 'error');
    }
  });

  // 2. Logout
  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLogin();
    showToast('로그아웃되었습니다.');
  });

  // 3. Record Attendance (Supabase Port with IP restriction, Clock Sync & Late Reason Modal)
  let pendingCheckInData = null;

  checkInBtn.addEventListener('click', async () => {
    if (!currentUser || !supabaseClient) return;

    const selectedShift = document.querySelector('input[name="shift-type"]:checked').value;
    
    try {
      checkInBtn.disabled = true;
      checkInBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 전송 중...';

      // A. Fetch verified internet time
      const verifiedTime = await getVerifiedTime();
      const pad = (n) => String(n).padStart(2, '0');
      const todayStr = `${verifiedTime.getFullYear()}-${pad(verifiedTime.getMonth() + 1)}-${pad(verifiedTime.getDate())}`;

      // B. Daily Check-in Lock (Verify if record exists for today)
      const { data: existingRecords, error: checkError } = await supabaseClient
        .from('attendance')
        .select('check_in_time')
        .eq('employee_id', currentUser.employee_id)
        .like('check_in_time', `${todayStr}%`);

      if (checkError) throw checkError;

      if (existingRecords && existingRecords.length > 0) {
        existingRecords.sort((a, b) => a.check_in_time.localeCompare(b.check_in_time));
        const firstCheckInStr = existingRecords[0].check_in_time;
        showToast(`오늘은 이미 출근 체크를 완료하셨습니다. (출근 시각: ${firstCheckInStr})`, 'error');
        
        openResultModal({
          success: false,
          name: currentUser.name,
          employeeId: currentUser.employee_id,
          shiftType: selectedShift,
          checkInTime: firstCheckInStr,
          message: `오늘은 이미 출근 체크를 완료하셨습니다.`
        });
        return;
      }

      // C. Get Settings (IP restrictions) from Supabase
      const { data: settingsList, error: settingsError } = await supabaseClient
        .from('settings')
        .select('*');

      if (settingsError) throw settingsError;

      const settings = {};
      settingsList.forEach(s => {
        settings[s.key] = s.value;
      });

      const restrictionEnabled = settings.ip_restriction_enabled === 'true';
      const allowedIps = (settings.allowed_ips || '').split(',').map(ip => ip.trim());

      const isLocalhost = currentClientIp === '127.0.0.1' || currentClientIp === '::1' || currentClientIp === 'localhost';

      // IP validation
      if (restrictionEnabled && !isLocalhost && !allowedIps.includes(currentClientIp)) {
        const errorMsg = `회사 외부 네트워크에서는 출근 체크를 할 수 없습니다. (접속 IP: ${currentClientIp})`;
        showToast(errorMsg, 'error');
        
        openResultModal({
          success: false,
          name: currentUser.name,
          employeeId: currentUser.employee_id,
          shiftType: selectedShift,
          checkInTime: todayStr + " " + verifiedTime.toTimeString().substring(0, 8),
          message: errorMsg
        });
        return;
      }

      // D. Determine Late status
      const status = checkLateStatus(selectedShift, verifiedTime);

      if (status.isLate) {
        // [지각 발생] 지각 사유 입력 모달 띄우기
        pendingCheckInData = {
          shiftType: selectedShift,
          verifiedTime,
          clientIp: currentClientIp,
          isLate: true,
          checkInTimeStr: status.checkInTimeStr
        };
        
        document.getElementById('late-reason-input').value = '';
        document.getElementById('late-reason-modal').classList.remove('hidden');
        checkInBtn.disabled = false;
        checkInBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> 출근하기';
      } else {
        // [정상 출근] 즉시 데이터 등록 진행
        await executeCheckIn(selectedShift, verifiedTime, currentClientIp, false, status.checkInTimeStr, null);
      }

    } catch (err) {
      console.error(err);
      showToast('출근 처리 도중 오류가 발생했습니다.', 'error');
      checkInBtn.disabled = false;
      checkInBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> 출근하기';
    }
  });

  // 지각 사유 등록 버튼 클릭 핸들러
  document.getElementById('btn-submit-late').addEventListener('click', async () => {
    if (!pendingCheckInData || !currentUser) return;
    
    const reasonInput = document.getElementById('late-reason-input');
    const reasonText = reasonInput.value.trim();

    if (!reasonText) {
      showToast('지각 사유를 입력해 주세요.', 'error');
      reasonInput.focus();
      return;
    }

    try {
      const submitBtn = document.getElementById('btn-submit-late');
      submitBtn.disabled = true;
      submitBtn.textContent = '등록 중...';

      document.getElementById('late-reason-modal').classList.add('hidden');
      
      await executeCheckIn(
        pendingCheckInData.shiftType,
        pendingCheckInData.verifiedTime,
        pendingCheckInData.clientIp,
        true,
        pendingCheckInData.checkInTimeStr,
        reasonText
      );

      pendingCheckInData = null;
    } catch (err) {
      console.error(err);
      showToast('지각 사유 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      const submitBtn = document.getElementById('btn-submit-late');
      submitBtn.disabled = false;
      submitBtn.textContent = '사유 등록 및 출근 완료';
    }
  });

  // 최종 Supabase 기록 실행 공통 함수
  async function executeCheckIn(shiftType, verifiedTime, clientIp, isLate, checkInTimeStr, lateReason) {
    try {
      const { data: attendanceRecord, error: insertError } = await supabaseClient
        .from('attendance')
        .insert([{
          employee_id: currentUser.employee_id,
          name: currentUser.name,
          shift_type: shiftType,
          check_in_time: checkInTimeStr,
          is_late: isLate,
          ip_address: clientIp,
          late_reason: lateReason
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      showToast(isLate ? '지각 처리되었습니다.' : '출근 완료되었습니다.', 'success');
      
      openResultModal({
        success: true,
        name: attendanceRecord.name,
        employeeId: attendanceRecord.employee_id,
        shiftType: attendanceRecord.shift_type,
        checkInTime: attendanceRecord.check_in_time,
        isLate: attendanceRecord.is_late === true,
        message: isLate ? '지각 처리되었습니다.' : '출근 완료되었습니다.'
      });

      // 출근 이력 새로고침 (이력 조회 탭이 활성화되어 있을 때 갱신)
      if (document.querySelector('[data-user-tab="history"]').classList.contains('active')) {
        fetchMyHistoryRecords();
      }

    } catch (err) {


      console.error(err);
      showToast('출근 처리 도중 오류가 발생했습니다.', 'error');
    } finally {
      checkInBtn.disabled = false;
      checkInBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> 출근하기';
    }
  }


  // --- RESULT MODAL ---
  function openResultModal(details) {
    resName.textContent = `${details.name} (${details.employeeId})`;
    resShift.textContent = `${details.shiftType} 근무`;
    resTime.textContent = details.checkInTime;

    if (!details.success) {
      modalStatusIcon.className = 'modal-icon text-danger';
      modalStatusIcon.innerHTML = '<i class="fa-solid fa-ban"></i>';
      modalTitle.textContent = '출근 제한';
      resLateBadge.className = 'res-val badge badge-danger';
      resLateBadge.textContent = '제한됨';
    } else {
      if (details.isLate) {
        modalStatusIcon.className = 'modal-icon text-danger';
        modalStatusIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        modalTitle.textContent = '출근 완료 (지각)';
        resLateBadge.className = 'res-val badge badge-danger';
        resLateBadge.textContent = '지각';
      } else {
        modalStatusIcon.className = 'modal-icon text-success';
        modalStatusIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        modalTitle.textContent = '출근 완료 (정상)';
        resLateBadge.className = 'res-val badge badge-success';
        resLateBadge.textContent = '정상';
      }
    }

    resultModal.classList.remove('hidden');
  }

  modalCloseBtn.addEventListener('click', () => {
    resultModal.classList.add('hidden');
  });

  // --- ADMIN VIEW & SECURITY CONTROLS ---

  adminEntryBtn.addEventListener('click', () => {
    showAdminPanel();
  });

  adminCloseBtn.addEventListener('click', () => {
    if (currentUser) {
      showDashboard();
    } else {
      showLogin();
    }
  });

  adminLoginSubmit.addEventListener('click', submitAdminLogin);
  adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitAdminLogin();
  });

  // Admin authentication (Validate via Supabase settings)
  async function submitAdminLogin() {
    const password = adminPasswordInput.value;
    if (!password || !supabaseClient) return;

    try {
      const { data: row, error } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'admin_password')
        .single();

      if (error) throw error;

      if (row.value === password) {
        adminToken = 'admin-authorized-token-temp';
        sessionStorage.setItem('adminToken', adminToken);
        adminPasswordInput.value = '';
        adminAuthError.textContent = '';
        adminAuthBox.classList.add('hidden');
        adminMainContent.classList.remove('hidden');
        loadAdminData();
        showToast('관리자 인증에 성공했습니다.', 'success');
      } else {
        adminAuthError.textContent = '비밀번호가 올바르지 않습니다.';
      }
    } catch (err) {
      console.error(err);
      adminAuthError.textContent = '서버 접속 실패';
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      activeTab = tabId;
      
      loadAdminData();
    });
  });

  // --- ADMIN DATA FETCHING (SUPABASE PORT) ---

  function loadAdminData() {
    if (!supabaseClient) return;
    
    if (activeTab === 'tab-records') {
      fetchAttendanceRecords();
    } else if (activeTab === 'tab-employees') {
      fetchEmployees();
    } else if (activeTab === 'tab-settings') {
      fetchSettings();
    }
  }

  // 0. Fetch Personal Logs (Full search with Start/End date)
  async function fetchMyHistoryRecords() {
    if (!currentUser || !supabaseClient) return;

    const start = myFilterStartDate.value;
    const end = myFilterEndDate.value;

    try {
      let query = supabaseClient.from('attendance').select('*').eq('employee_id', currentUser.employee_id);
      
      if (start) {
        query = query.gte('check_in_time', `${start} 00:00:00`);
      }
      if (end) {
        query = query.lte('check_in_time', `${end} 23:59:59`);
      }

      const { data: records, error } = await query.order('check_in_time', { ascending: false });

      if (error) throw error;

      myHistoryRecords = records;
      renderMyHistoryTable(records);
    } catch (err) {
      console.error(err);
      showToast('개인 기록 로드 실패', 'error');
    }
  }

  function renderMyHistoryTable(records) {
    myHistoryTableBody.innerHTML = '';
    if (!records || records.length === 0) {
      myHistoryNoRecordsMsg.classList.remove('hidden');
      return;
    }
    myHistoryNoRecordsMsg.classList.add('hidden');

    records.forEach(rec => {
      const tr = document.createElement('tr');
      const isLateText = rec.is_late ? '지각' : '정상';
      const badgeClass = rec.is_late ? 'badge badge-danger' : 'badge badge-success';
      const lateReasonText = rec.late_reason || '-';

      tr.innerHTML = `
        <td>${rec.check_in_time}</td>
        <td>${rec.shift_type}</td>
        <td><span class="${badgeClass}">${isLateText}</span></td>
        <td>${lateReasonText}</td>
        <td><code>${rec.ip_address || '-'}</code></td>
      `;
      myHistoryTableBody.appendChild(tr);
    });
  }

  // Personal history excel exporter
  function exportMyExcel() {
    if (!myHistoryRecords || myHistoryRecords.length === 0) {
      showToast('다운로드할 기록이 없습니다.', 'error');
      return;
    }

    const formattedData = myHistoryRecords.map(rec => ({
      '출근 일자 및 시각': rec.check_in_time,
      '근무 형태': rec.shift_type,
      '지각 여부': rec.is_late ? '지각' : '정상',
      '지각 사유': rec.late_reason || '',
      '접속 IP': rec.ip_address || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '내 출근 기록');

    const startStr = myFilterStartDate.value || '';
    const endStr = myFilterEndDate.value || '';
    const filename = `내근태기록_${currentUser.name}_${startStr}_to_${endStr}.xlsx`;

    try {
      XLSX.writeFile(workbook, filename);
      showToast('엑셀 파일이 다운로드되었습니다.', 'success');
    } catch (err) {
      console.error(err);
      showToast('엑셀 다운로드 도중 오류가 발생했습니다.', 'error');
    }
  }

  // 1. Fetch Logs
  async function fetchAttendanceRecords() {


    const startDate = filterStartDate.value;
    const endDate = filterEndDate.value;
    const empName = filterEmpName.value.trim();

    try {
      let query = supabaseClient.from('attendance').select('*');
      
      if (startDate) {
        query = query.gte('check_in_time', `${startDate} 00:00:00`);
      }
      if (endDate) {
        query = query.lte('check_in_time', `${endDate} 23:59:59`);
      }
      if (empName) {
        query = query.ilike('name', `%${empName}%`);
      }

      const { data: records, error } = await query.order('check_in_time', { ascending: false });


      if (error) throw error;

      attendanceRecords = records;
      renderAttendanceTable(records);
    } catch (err) {
      console.error(err);
      showToast('출근 기록 로드 실패', 'error');
    }
  }


  function renderAttendanceTable(records) {
    attendanceTableBody.innerHTML = '';
    if (records.length === 0) {
      noRecordsMsg.classList.remove('hidden');
      return;
    }
    noRecordsMsg.classList.add('hidden');

    records.forEach(rec => {
      const tr = document.createElement('tr');
      const isLateText = rec.is_late ? '지각' : '정상';
      const badgeClass = rec.is_late ? 'badge badge-danger' : 'badge badge-success';
      const lateReasonText = rec.late_reason || '-';
      
      tr.innerHTML = `
        <td>${rec.check_in_time}</td>
        <td>${rec.employee_id}</td>
        <td>${rec.name}</td>
        <td>${rec.shift_type}</td>
        <td><span class="${badgeClass}">${isLateText}</span></td>
        <td>${lateReasonText}</td>
        <td><code>${rec.ip_address || '-'}</code></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action-edit" data-id="${rec.id}">수정</button>
            <button class="btn-action-delete" data-id="${rec.id}">삭제</button>
          </div>
        </td>
      `;
      attendanceTableBody.appendChild(tr);
    });

    // 수정 버튼 클릭 바인딩
    attendanceTableBody.querySelectorAll('.btn-action-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = parseInt(btn.dataset.id);
        openAdminEditModal(recordId);
      });
    });

    // 삭제 버튼 클릭 바인딩
    attendanceTableBody.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = parseInt(btn.dataset.id);
        deleteAttendanceRecord(recordId);
      });
    });
  }


  // 근무자용 하부 탭 버튼 바인딩 및 개인 리스너 등록
  userTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.userTab;
      if (!target) return; // Skip tab switching if it is an external link
      
      userTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      userTabContents.forEach(c => {
        if (c.id === `user-tab-${target}`) {
          c.classList.add('active');
          c.classList.remove('hidden');
        } else {
          c.classList.add('hidden');
          c.classList.remove('active');
        }
      });

      if (target === 'history') {
        fetchMyHistoryRecords();
      }
    });
  });

  btnSearchMyRecords.addEventListener('click', fetchMyHistoryRecords);
  btnResetMyFilters.addEventListener('click', () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    myFilterStartDate.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    myFilterEndDate.value = now.toISOString().split('T')[0];
    fetchMyHistoryRecords();
  });
  btnExportMyExcel.addEventListener('click', exportMyExcel);

  btnSearchRecords.addEventListener('click', fetchAttendanceRecords);
  btnResetFilters.addEventListener('click', () => {

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    filterStartDate.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    filterEndDate.value = now.toISOString().split('T')[0];
    filterEmpName.value = '';
    fetchAttendanceRecords();
  });

  // --- ADMIN ATTENDANCE CRUD SERVICES ---

  // 1. 사원 드롭다운 목록 가져오기
  async function loadEmployeesToSelect() {
    try {
      const { data: emps, error } = await supabaseClient
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      
      adminModalEmpSelect.innerHTML = '';
      emps.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.employee_id;
        opt.dataset.name = emp.name;
        opt.textContent = `${emp.name} (${emp.employee_id})`;
        adminModalEmpSelect.appendChild(opt);
      });
    } catch (err) {
      console.error('사원 목록 로드 실패:', err);
    }
  }

  // 2. 신규 등록 모달 열기
  async function openAdminAddModal() {
    editingRecordId = null;
    adminModalTitle.textContent = '출근 기록 신규 등록';
    adminModalEmpSelect.disabled = false;
    
    await loadEmployeesToSelect();
    
    // 현재 날짜/시간 포맷팅 (YYYY-MM-DD HH:MM:SS)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const checkInStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    adminModalTime.value = checkInStr;
    
    adminModalShift.value = '일반';
    document.querySelector('input[name="admin-modal-late"][value="false"]').checked = true;
    adminModalReason.value = '';
    adminModalReasonGroup.style.display = 'none';
    
    adminRecordModal.classList.remove('hidden');
  }

  // 3. 수정 모달 열기
  async function openAdminEditModal(recordId) {
    editingRecordId = recordId;
    adminModalTitle.textContent = '출근 기록 수정';
    
    const record = attendanceRecords.find(r => r.id === recordId);
    if (!record) return;

    adminModalEmpSelect.innerHTML = `<option value="${record.employee_id}">${record.name} (${record.employee_id})</option>`;
    adminModalEmpSelect.disabled = true;

    adminModalTime.value = record.check_in_time;
    adminModalShift.value = record.shift_type;
    
    const isLate = record.is_late === true;
    document.querySelector(`input[name="admin-modal-late"][value="${isLate}"]`).checked = true;
    
    adminModalReason.value = record.late_reason || '';
    adminModalReasonGroup.style.display = isLate ? 'flex' : 'none';
    
    adminRecordModal.classList.remove('hidden');
  }

  // 4. 레코드 삭제 기능
  async function deleteAttendanceRecord(recordId) {
    const record = attendanceRecords.find(r => r.id === recordId);
    const nameStr = record ? `[${record.name}] 사원의 ` : '';
    if (!confirm(`⚠️ 정말로 ${nameStr}출근 기록을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('attendance')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      showToast('성공적으로 삭제되었습니다.', 'success');
      fetchAttendanceRecords();
    } catch (err) {
      console.error(err);
      showToast('출근 기록 삭제 실패', 'error');
    }
  }

  // 5. 모달 내 지각 라디오 버튼 토글 리스너
  document.querySelectorAll('input[name="admin-modal-late"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isLate = e.target.value === 'true';
      adminModalReasonGroup.style.display = isLate ? 'flex' : 'none';
    });
  });

  // 6. 모달 취소 및 추가 버튼 바인딩
  btnAdminModalCancel.addEventListener('click', () => {
    adminRecordModal.classList.add('hidden');
  });

  btnAddRecordModal.addEventListener('click', openAdminAddModal);

  // 7. 모달 저장/수정 완료 클릭 리스너
  btnAdminModalSave.addEventListener('click', async () => {
    const checkInTime = adminModalTime.value.trim();
    const shiftType = adminModalShift.value;
    const isLate = document.querySelector('input[name="admin-modal-late"]:checked').value === 'true';
    const lateReason = isLate ? adminModalReason.value.trim() : null;

    if (!checkInTime) {
      showToast('출근 일자 및 시각을 입력해 주세요.', 'error');
      return;
    }

    try {
      btnAdminModalSave.disabled = true;
      btnAdminModalSave.textContent = '저장 중...';

      if (editingRecordId === null) {
        // [INSERT] 신규 등록
        const selectedOpt = adminModalEmpSelect.options[adminModalEmpSelect.selectedIndex];
        if (!selectedOpt) {
          showToast('사원을 선택해 주세요.', 'error');
          return;
        }
        const employeeId = selectedOpt.value;
        const name = selectedOpt.dataset.name;

        const { error } = await supabaseClient
          .from('attendance')
          .insert([{
            employee_id: employeeId,
            name: name,
            shift_type: shiftType,
            check_in_time: checkInTime,
            is_late: isLate,
            late_reason: lateReason,
            ip_address: '관리자 수동 등록'
          }]);

        if (error) throw error;
        showToast('새 근태 기록이 등록되었습니다.', 'success');
      } else {
        // [UPDATE] 기존 수정
        const { error } = await supabaseClient
          .from('attendance')
          .update({
            check_in_time: checkInTime,
            shift_type: shiftType,
            is_late: isLate,
            late_reason: lateReason
          })
          .eq('id', editingRecordId);

        if (error) throw error;
        showToast('근태 기록이 수정되었습니다.', 'success');
      }

      adminRecordModal.classList.add('hidden');
      fetchAttendanceRecords();
    } catch (err) {
      console.error(err);
      showToast('저장 도중 오류가 발생했습니다.', 'error');
    } finally {
      btnAdminModalSave.disabled = false;
      btnAdminModalSave.textContent = '저장 완료';
    }
  });




  // 2. Fetch Employee List
  async function fetchEmployees() {
    try {
      const { data: employees, error } = await supabaseClient
        .from('employees')
        .select('*')
        .order('employee_id', { ascending: true });

      if (error) throw error;
      renderEmployeeTable(employees);
    } catch (err) {
      console.error(err);
      showToast('직원 목록 로드 실패', 'error');
    }
  }

  function renderEmployeeTable(employees) {
    employeeTableBody.innerHTML = '';
    if (employees.length === 0) {
      employeeTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">등록된 직원이 없습니다.</td></tr>';
      return;
    }

    employees.forEach(emp => {
      const tr = document.createElement('tr');
      const regDate = emp.created_at ? emp.created_at.substring(0, 10) : '-';
      tr.innerHTML = `
        <td>${emp.employee_id}</td>
        <td>${emp.name}</td>
        <td>${regDate}</td>
      `;
      employeeTableBody.appendChild(tr);
    });
  }

  // Register New Employee 수동
  newEmployeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newEmpName.value.trim();
    const employeeId = newEmpId.value.trim();

    if (!name || !employeeId) return;

    try {
      // Duplicate check
      const { data: existing, error: findError } = await supabaseClient
        .from('employees')
        .select('employee_id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        showToast('이미 등록된 사번입니다.', 'error');
        return;
      }

      const { error: insertError } = await supabaseClient
        .from('employees')
        .insert([{ employee_id: employeeId, name }]);

      if (insertError) throw insertError;

      showToast('사원이 성공적으로 등록되었습니다.', 'success');
      newEmpName.value = '';
      newEmpId.value = '';
      fetchEmployees();
    } catch (err) {
      console.error(err);
      showToast('사원 등록 중 서버 오류', 'error');
    }
  });

  // 3. Fetch Settings
  async function fetchSettings() {
    try {
      const { data: list, error } = await supabaseClient
        .from('settings')
        .select('*');

      if (error) throw error;

      const settings = {};
      list.forEach(s => {
        settings[s.key] = s.value;
      });

      settingIpToggle.checked = settings.ip_restriction_enabled === 'true';
      settingAllowedIps.value = settings.allowed_ips || '';
    } catch (err) {
      console.error(err);
    }
  }

  // Save Settings
  btnSaveSettings.addEventListener('click', async () => {
    const ip_restriction_enabled = settingIpToggle.checked;
    const allowed_ips = settingAllowedIps.value.trim();
    const newPwd = settingNewPassword.value;
    const newPwdConfirm = settingNewPasswordConfirm.value;

    const updates = [
      { key: 'ip_restriction_enabled', value: String(ip_restriction_enabled) },
      { key: 'allowed_ips', value: allowed_ips }
    ];

    if (newPwd) {
      if (newPwd !== newPwdConfirm) {
        showToast('새 비밀번호와 비밀번호 확인이 다릅니다.', 'error');
        return;
      }
      updates.push({ key: 'admin_password', value: newPwd });
    }

    try {
      for (const item of updates) {
        const { error } = await supabaseClient
          .from('settings')
          .upsert(item);
        
        if (error) throw error;
      }

      showToast('설정이 성공적으로 저장되었습니다.', 'success');
      settingNewPassword.value = '';
      settingNewPasswordConfirm.value = '';
      fetchSettings();

      if (newPwd) {
        adminToken = null;
        sessionStorage.removeItem('adminToken');
        showAdminPanel();
      }
    } catch (err) {
      console.error(err);
      showToast('설정 저장 실패', 'error');
    }
  });

  // --- EXCEL EXPORT (USING SHEETJS) ---
  btnExportExcel.addEventListener('click', () => {
    if (attendanceRecords.length === 0) {
      showToast('내보낼 출근 기록 데이터가 없습니다.', 'error');
      return;
    }

    const formattedData = attendanceRecords.map(rec => ({
      '출근 일자 및 시각': rec.check_in_time,
      '사번': rec.employee_id,
      '이름': rec.name,
      '근무 형태': rec.shift_type,
      '지각 여부': rec.is_late ? '지각' : '정상',
      '지각 사유': rec.late_reason || '',
      '접속 IP': rec.ip_address || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '출근 기록');

    const startStr = filterStartDate.value || '';
    const endStr = filterEndDate.value || '';
    const filename = `근태기록_${startStr}_to_${endStr}.xlsx`;

    try {

      XLSX.writeFile(workbook, filename);
      showToast('엑셀 파일이 다운로드되었습니다.', 'success');
    } catch (err) {
      console.error(err);
      showToast('엑셀 파일 생성 중 오류가 발생했습니다.', 'error');
    }
  });
});

// services/telegramIntegration.ts

declare global {
    interface Window {
      Telegram?: {
        WebApp: any;
      };
    }
  }
  
  export const initTelegram = () => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Настройка темы
      tg.setHeaderColor('#0c0c0c');
      tg.setBackgroundColor('#0c0c0c');
      
      // Включаем кнопку "Назад" если нужно
      tg.BackButton.hide();
      
      return tg;
    }
    
    return null;
  };
  
  export const getTelegramUser = () => {
    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user || null;
  };
  
  export const showTelegramAlert = (message: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.showAlert(message);
    } else {
      alert(message);
    }
  };
  
  export const closeTelegramApp = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.close();
    }
  };
  
  export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(type);
    }
  };
  
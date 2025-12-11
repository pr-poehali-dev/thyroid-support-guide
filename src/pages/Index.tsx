import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface DailyRecord {
  date: string;
  completed: number;
  total: number;
}

const Index = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', label: 'Таблетка принята утром натощак', checked: false },
    { id: '2', label: 'Уровень энергии в норме', checked: false },
    { id: '3', label: 'Настроение стабильное', checked: false },
    { id: '4', label: 'Нет новых отеков', checked: false },
    { id: '5', label: 'Не жалуется на холод', checked: false },
  ]);

  const [history, setHistory] = useState<DailyRecord[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);

  useEffect(() => {
    const savedChecklist = localStorage.getItem('checklist');
    const savedHistory = localStorage.getItem('history');
    const lastSaved = localStorage.getItem('lastSaved');

    if (savedChecklist) {
      setChecklist(JSON.parse(savedChecklist));
    }

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const today = new Date().toLocaleDateString('ru-RU');
    if (lastSaved !== today) {
      localStorage.setItem('lastSaved', today);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('checklist', JSON.stringify(checklist));
  }, [checklist]);

  const handleCheckboxChange = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const resetChecklist = () => {
    const completedCount = checklist.filter((item) => item.checked).length;
    const today = new Date().toLocaleDateString('ru-RU');

    const newRecord: DailyRecord = {
      date: today,
      completed: completedCount,
      total: checklist.length,
    };

    const updatedHistory = [...history];
    const existingIndex = updatedHistory.findIndex((record) => record.date === today);

    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = newRecord;
    } else {
      updatedHistory.push(newRecord);
    }

    const last7Days = updatedHistory.slice(-7);
    setHistory(last7Days);
    localStorage.setItem('history', JSON.stringify(last7Days));

    setChecklist((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  const completedCount = checklist.filter((item) => item.checked).length;
  const progressPercentage = (completedCount / checklist.length) * 100;

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const maxCompleted = Math.max(...history.map((r) => r.completed), 5);

  const exportToPDF = () => {
    if (history.length === 0) {
      toast.error('Нет данных для экспорта', {
        description: 'Начните отмечать чек-лист, чтобы создать историю',
      });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('История выполнения чек-листа', 20, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Памятка для родственников пациента с гипотиреозом', 20, 30);
    
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    let yPosition = 45;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Статистика выполнения:', 20, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    history.forEach((record, index) => {
      const percentage = Math.round((record.completed / record.total) * 100);
      const text = `${record.date}: ${record.completed}/${record.total} (${percentage}%)`;
      
      if (percentage === 100) {
        doc.setTextColor(34, 197, 94);
        doc.text('✓', 20, yPosition);
      } else {
        doc.setTextColor(14, 165, 233);
        doc.text('○', 20, yPosition);
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(text, 28, yPosition);
      
      const barWidth = 100;
      const barHeight = 5;
      const barX = 110;
      const barY = yPosition - 3;
      
      doc.setFillColor(230, 230, 230);
      doc.rect(barX, barY, barWidth, barHeight, 'F');
      
      const filledWidth = (barWidth * percentage) / 100;
      if (percentage === 100) {
        doc.setFillColor(34, 197, 94);
      } else {
        doc.setFillColor(14, 165, 233);
      }
      doc.rect(barX, barY, filledWidth, barHeight, 'F');
      
      yPosition += 12;
      
      if (yPosition > 270 && index < history.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    yPosition += 10;
    doc.setDrawColor(14, 165, 233);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Пункты чек-листа:', 20, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    checklist.forEach((item, index) => {
      const itemText = `${index + 1}. ${item.label}`;
      const lines = doc.splitTextToSize(itemText, 170);
      
      if (yPosition + (lines.length * 6) > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      lines.forEach((line: string) => {
        doc.text(line, 20, yPosition);
        yPosition += 6;
      });
      
      yPosition += 2;
    });
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    } else {
      yPosition += 15;
    }
    
    doc.setFillColor(211, 228, 253);
    doc.roundedRect(20, yPosition, 170, 30, 3, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(14, 165, 233);
    doc.text('💡 Важно помнить', 25, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const reminderText = 'Ваша поддержка — 50% успеха в лечении! Пациенты, чьи близкие активно';
    const reminderText2 = 'участвуют в процессе лечения, быстрее восстанавливаются и лучше';
    const reminderText3 = 'соблюдают рекомендации врачей.';
    doc.text(reminderText, 25, yPosition + 15);
    doc.text(reminderText2, 25, yPosition + 20);
    doc.text(reminderText3, 25, yPosition + 25);
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Создано: ${new Date().toLocaleDateString('ru-RU')} | Страница ${i} из ${pageCount}`,
        20,
        285
      );
    }
    
    const fileName = `checklist-history-${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.pdf`;
    doc.save(fileName);
    
    toast.success('PDF успешно создан!', {
      description: 'История чек-листа сохранена в файл',
    });
  };

  const generatePDFBase64 = () => {
    if (history.length === 0) {
      return null;
    }

    const doc = new jsPDF();
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('История выполнения чек-листа', 20, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Памятка для родственников пациента с гипотиреозом', 20, 30);
    
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    let yPosition = 45;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Статистика выполнения:', 20, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    history.forEach((record, index) => {
      const percentage = Math.round((record.completed / record.total) * 100);
      const text = `${record.date}: ${record.completed}/${record.total} (${percentage}%)`;
      
      if (percentage === 100) {
        doc.setTextColor(34, 197, 94);
        doc.text('✓', 20, yPosition);
      } else {
        doc.setTextColor(14, 165, 233);
        doc.text('○', 20, yPosition);
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(text, 28, yPosition);
      
      const barWidth = 100;
      const barHeight = 5;
      const barX = 110;
      const barY = yPosition - 3;
      
      doc.setFillColor(230, 230, 230);
      doc.rect(barX, barY, barWidth, barHeight, 'F');
      
      const filledWidth = (barWidth * percentage) / 100;
      if (percentage === 100) {
        doc.setFillColor(34, 197, 94);
      } else {
        doc.setFillColor(14, 165, 233);
      }
      doc.rect(barX, barY, filledWidth, barHeight, 'F');
      
      yPosition += 12;
      
      if (yPosition > 270 && index < history.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    yPosition += 10;
    doc.setDrawColor(14, 165, 233);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Пункты чек-листа:', 20, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    checklist.forEach((item, index) => {
      const itemText = `${index + 1}. ${item.label}`;
      const lines = doc.splitTextToSize(itemText, 170);
      
      if (yPosition + (lines.length * 6) > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      lines.forEach((line: string) => {
        doc.text(line, 20, yPosition);
        yPosition += 6;
      });
      
      yPosition += 2;
    });
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    } else {
      yPosition += 15;
    }
    
    doc.setFillColor(211, 228, 253);
    doc.roundedRect(20, yPosition, 170, 30, 3, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(14, 165, 233);
    doc.text('💡 Важно помнить', 25, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const reminderText = 'Ваша поддержка — 50% успеха в лечении! Пациенты, чьи близкие активно участвуют';
    const reminderText2 = 'в процессе лечения, быстрее восстанавливаются и лучше соблюдают рекомендации';
    const reminderText3 = 'врачей.';
    doc.text(reminderText, 25, yPosition + 15);
    doc.text(reminderText2, 25, yPosition + 20);
    doc.text(reminderText3, 25, yPosition + 25);
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Создано: ${new Date().toLocaleDateString('ru-RU')} | Страница ${i} из ${pageCount}`,
        20,
        285
      );
    }
    
    const pdfOutput = doc.output('datauristring');
    const base64 = pdfOutput.split(',')[1];
    return base64;
  };

  const sendPDFByEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.error('Некорректный email адрес');
      return;
    }

    setIsEmailSending(true);

    try {
      const pdfBase64 = generatePDFBase64();
      
      if (!pdfBase64) {
        toast.error('Нет данных для отправки');
        setIsEmailSending(false);
        return;
      }

      const response = await fetch('https://functions.poehali.dev/bccd7bdc-6d69-428b-adcf-cac0745e5e7c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          pdfBase64: pdfBase64,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Email успешно отправлен!', {
          description: `PDF отправлен на ${emailAddress}`,
        });
        setEmailDialogOpen(false);
        setEmailAddress('');
      } else {
        toast.error('Ошибка отправки', {
          description: data.error || 'Попробуйте позже',
        });
      }
    } catch (error) {
      toast.error('Ошибка отправки', {
        description: 'Проверьте подключение к интернету',
      });
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Heart" className="text-primary" size={28} />
              <h1 className="text-xl font-bold text-primary">Поддержка близких</h1>
            </div>
            <div className="hidden md:flex gap-6">
              {[
                { id: 'hero', label: 'Главная' },
                { id: 'about', label: 'О болезни' },
                { id: 'tips', label: 'Советы' },
                { id: 'checklist', label: 'Чек-лист' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    activeSection === item.id ? 'text-primary' : 'text-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <section id="hero" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-100 text-primary rounded-full text-sm font-semibold">
            Памятка для родственников
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-gray-800 leading-tight">
            Ваша помощь бесценна
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Советы родным пациента с гипотиреозом
          </p>
          <p className="text-lg text-gray-700 mb-10 max-w-2xl mx-auto">
            Гипотиреоз – это не лень и не плохой характер. Это болезнь, которая вызывает усталость,
            забывчивость и подавленность.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => scrollToSection('checklist')} className="text-base">
              <Icon name="CheckSquare" className="mr-2" size={20} />
              Открыть чек-лист
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('tips')}
              className="text-base"
            >
              <Icon name="BookOpen" className="mr-2" size={20} />
              Читать советы
            </Button>
          </div>
        </div>
      </section>

      <section id="about" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Icon name="Info" className="mx-auto mb-4 text-primary" size={48} />
            <h2 className="text-4xl font-bold mb-4 text-gray-800">Что такое гипотиреоз?</h2>
            <p className="text-lg text-gray-600">
              Понимание болезни — первый шаг к правильной поддержке
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-blue-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Icon name="Activity" className="text-primary" size={24} />
                </div>
                <CardTitle className="text-xl">Причина болезни</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Щитовидная железа вырабатывает недостаточно гормонов, что замедляет обмен веществ
                  и влияет на все системы организма
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-blue-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Icon name="AlertCircle" className="text-primary" size={24} />
                </div>
                <CardTitle className="text-xl">Основные симптомы</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Постоянная усталость, сонливость, зябкость, отёки, набор веса, забывчивость,
                  подавленное настроение
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-blue-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Icon name="Pill" className="text-primary" size={24} />
                </div>
                <CardTitle className="text-xl">Лечение</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Ежедневный приём гормональных препаратов утром натощак. При правильном лечении
                  симптомы уходят, человек возвращается к нормальной жизни
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-blue-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Icon name="TrendingUp" className="text-primary" size={24} />
                </div>
                <CardTitle className="text-xl">Прогноз</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  При регулярном приёме препаратов и контроле анализов прогноз отличный. Люди живут
                  полноценной жизнью без ограничений
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="tips" className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Icon name="Users" className="mx-auto mb-4 text-primary" size={48} />
            <h2 className="text-4xl font-bold mb-4 text-gray-800">Что вы можете сделать</h2>
            <p className="text-lg text-gray-600">6 практических способов помочь близкому человеку</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-blue-100 rounded-lg px-6 bg-white">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon name="Clock" className="text-primary" size={20} />
                  </div>
                  <span>1. Будьте «будильником»</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-700 pt-4 pl-13">
                Тактично напоминайте о ежедневном приёме таблетки утром. Можно поставить общее
                напоминание на телефон или использовать чек-лист на этом сайте.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-blue-100 rounded-lg px-6 bg-white">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon name="Salad" className="text-primary" size={20} />
                  </div>
                  <span>2. Помогайте с диетой</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-700 pt-4 pl-13">
                Готовьте вместе полезные блюда с овощами и клетчаткой. Избегайте соблазнов — не
                покупайте много сладкого и выпечки.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-blue-100 rounded-lg px-6 bg-white">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon name="Heart" className="text-primary" size={20} />
                  </div>
                  <span>3. Будьте терпеливы</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-700 pt-4 pl-13">
                Не говорите «возьми себя в руки». Лучше предложите помощь по дому или спокойную
                совместную прогулку. Понимание и поддержка важнее нотаций.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-blue-100 rounded-lg px-6 bg-white">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon name="AlertTriangle" className="text-primary" size={20} />
                  </div>
                  <span>4. Следите за тревожными симптомами</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-700 pt-4 pl-13">
                <p className="mb-3">
                  Вы можете заметить опасные симптомы раньше самого пациента:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Сильная заторможенность, необычная сонливость, спутанность речи</li>
                  <li>Нарастающие отёки на лице</li>
                  <li>Жалобы на сильный холод</li>
                </ul>
                <p className="mt-3 font-semibold">При этих симптомах – срочно к врачу!</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-blue-100 rounded-lg px-6 bg-white">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon name="Calendar" className="text-primary" size={20} />
                  </div>
                  <span>5. Поддерживайте визиты к врачу</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-700 pt-4 pl-13">
                Помогите записаться на приём, сопроводите на анализы. Поддержка на приёме снижает
                стресс и помогает лучше запомнить рекомендации врача.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-blue-100 rounded-lg px-6 bg-white">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon name="ThumbsUp" className="text-primary" size={20} />
                  </div>
                  <span>6. Хвалите за успехи</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base text-gray-700 pt-4 pl-13">
                Отмечайте позитивные изменения: отёки уменьшились, появилось больше сил, улучшилось
                настроение. Это лучшая мотивация продолжать лечение!
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Card className="mt-10 border-2 border-primary/20 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Icon name="Lightbulb" className="text-primary shrink-0 mt-1" size={28} />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">Важно помнить</h3>
                  <p className="text-base text-gray-700">
                    Ваша поддержка — 50% успеха в лечении! Пациенты, чьи близкие активно участвуют
                    в процессе лечения, быстрее восстанавливаются и лучше соблюдают рекомендации
                    врачей.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="checklist" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Icon name="CheckSquare" className="mx-auto mb-4 text-primary" size={48} />
            <h2 className="text-4xl font-bold mb-4 text-gray-800">Ежедневный чек-лист</h2>
            <p className="text-lg text-gray-600">Отмечайте каждый день для контроля состояния</p>
          </div>

          <Card className="mb-8 border-blue-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
              <CardTitle className="text-2xl flex items-center justify-between">
                <span>Выполнено сегодня</span>
                <span className="text-3xl font-bold text-primary">
                  {completedCount}/{checklist.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Progress value={progressPercentage} className="mb-6 h-3" />
              <div className="space-y-4">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-blue-50/50 transition-all"
                  >
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={() => handleCheckboxChange(item.id)}
                      className="w-6 h-6"
                    />
                    <label
                      htmlFor={item.id}
                      className={`text-base cursor-pointer flex-1 ${
                        item.checked ? 'line-through text-gray-500' : 'text-gray-800'
                      }`}
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
              <Button
                onClick={resetChecklist}
                variant="outline"
                className="w-full mt-6 text-base"
                size="lg"
              >
                <Icon name="RotateCcw" className="mr-2" size={20} />
                Сбросить на новый день
              </Button>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card className="border-blue-100">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Icon name="BarChart3" className="text-primary" size={28} />
                    История за последние 7 дней
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={exportToPDF} variant="outline" size="sm">
                      <Icon name="Download" className="mr-2" size={18} />
                      Скачать PDF
                    </Button>
                    <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="default" size="sm">
                          <Icon name="Mail" className="mr-2" size={18} />
                          Отправить на email
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Отправить PDF на email</DialogTitle>
                          <DialogDescription>
                            Введите email адрес для получения истории чек-листа
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email адрес</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="example@email.com"
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isEmailSending) {
                                  sendPDFByEmail();
                                }
                              }}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setEmailDialogOpen(false)}
                            disabled={isEmailSending}
                          >
                            Отмена
                          </Button>
                          <Button onClick={sendPDFByEmail} disabled={isEmailSending}>
                            {isEmailSending ? (
                              <>
                                <Icon name="Loader2" className="mr-2 animate-spin" size={18} />
                                Отправка...
                              </>
                            ) : (
                              <>
                                <Icon name="Send" className="mr-2" size={18} />
                                Отправить
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((record, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-600 w-24">{record.date}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Progress
                            value={(record.completed / record.total) * 100}
                            className="flex-1 h-6"
                          />
                          <span className="text-sm font-semibold text-gray-700 w-12">
                            {record.completed}/{record.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">
                    Визуализация прогресса
                  </h4>
                  <div className="flex items-end gap-2 h-48">
                    {history.map((record, index) => {
                      const percentage = (record.completed / record.total) * 100;
                      const height = (record.completed / maxCompleted) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className={`w-full rounded-t-lg transition-all ${
                              percentage === 100 ? 'bg-green-500' : 'bg-primary'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="text-xs text-gray-600 text-center">
                            {record.date.split('.').slice(0, 2).join('.')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <footer className="bg-gray-800 text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Icon name="Heart" className="mx-auto mb-4 text-primary" size={40} />
          <h3 className="text-2xl font-bold mb-4">Ваша поддержка бесценна</h3>
          <p className="text-gray-300 mb-6">
            Помните: гипотиреоз — это не приговор. При правильном лечении и вашей поддержке близкий
            человек вернётся к полноценной жизни.
          </p>
          <div className="flex gap-6 justify-center text-sm text-gray-400">
            <button onClick={() => scrollToSection('hero')} className="hover:text-primary transition-colors">
              Главная
            </button>
            <button onClick={() => scrollToSection('about')} className="hover:text-primary transition-colors">
              О болезни
            </button>
            <button onClick={() => scrollToSection('tips')} className="hover:text-primary transition-colors">
              Советы
            </button>
            <button onClick={() => scrollToSection('checklist')} className="hover:text-primary transition-colors">
              Чек-лист
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
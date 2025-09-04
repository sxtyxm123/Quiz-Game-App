import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { QuestionComponent } from './Question';
import { Results } from './Results';
import { Clock, RotateCcw, Trophy, Wifi, WifiOff } from 'lucide-react';
import { fallbackQuestions } from '../data/questions';

export interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  category: string;
}

export interface UserAnswer {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: UserAnswer[];
  selectedAnswer: string;
  isLoading: boolean;
  error: string | null;
  isQuizComplete: boolean;
  score: number;
  timeLeft: number;
  difficulty: string;
  timerEnabled: boolean;
  useOfflineMode: boolean;
}

export function Quiz() {
  const [state, setState] = useState<QuizState>({
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    selectedAnswer: '',
    isLoading: false,
    error: null,
    isQuizComplete: false,
    score: 0,
    timeLeft: 30,
    difficulty: 'medium',
    timerEnabled: true,
    useOfflineMode: false,
  });

  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [highScores, setHighScores] = useState<number[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  // Load high scores from localStorage
  useEffect(() => {
    const savedScores = localStorage.getItem('quizHighScores');
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (!state.timerEnabled || state.isQuizComplete || state.timeLeft === 0 || state.questions.length === 0) return;

    const timer = setInterval(() => {
      setState(prev => {
        if (prev.timeLeft <= 1) {
          // Auto-submit when time runs out, but only if we have questions
          if (prev.questions.length > 0 && prev.currentQuestionIndex < prev.questions.length) {
            handleAnswerSubmit(prev.selectedAnswer || '');
          }
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.timeLeft, state.timerEnabled, state.isQuizComplete, state.questions.length]);

  // Keyboard navigation for quiz controls
  useEffect(() => {
    if (state.isQuizComplete || state.questions.length === 0) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && state.selectedAnswer) {
        event.preventDefault();
        handleAnswerSubmit();
      } else if (event.key === 'ArrowLeft' && state.currentQuestionIndex > 0) {
        event.preventDefault();
        handlePreviousQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state.selectedAnswer, state.currentQuestionIndex, state.isQuizComplete, state.questions.length]);

  const loadOfflineQuestions = (difficulty: string = 'medium') => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setUsingFallback(true);
    
    // Use imported fallback questions
    let filteredQuestions = fallbackQuestions;
    if (difficulty !== 'mixed') {
      filteredQuestions = fallbackQuestions.filter((q: Question) => q.difficulty === difficulty);
    }
    
    // If no questions for this difficulty, use all questions
    if (filteredQuestions.length === 0) {
      filteredQuestions = fallbackQuestions;
    }
    
    // Shuffle and take up to 10 questions
    const shuffledQuestions = filteredQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(10, filteredQuestions.length));

    setState(prev => ({
      ...prev,
      questions: shuffledQuestions,
      isLoading: false,
      currentQuestionIndex: 0,
      userAnswers: [],
      selectedAnswer: '',
      isQuizComplete: false,
      score: 0,
      timeLeft: 30,
      difficulty,
    }));
    setQuestionStartTime(Date.now());
  };

  const fetchQuestions = async (difficulty: string = 'medium') => {
    // If offline mode is enabled, use local questions directly
    if (state.useOfflineMode) {
      loadOfflineQuestions(difficulty);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check if we're online first
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      // Try API with shorter timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `https://opentdb.com/api.php?amount=10&difficulty=${difficulty}&type=multiple`,
        { 
          method: 'GET',
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.response_code !== 0) {
        throw new Error('No questions available from API');
      }

      // Decode HTML entities
      const decodedQuestions = data.results.map((q: any) => ({
        ...q,
        question: decodeHTML(q.question),
        correct_answer: decodeHTML(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map((ans: string) => decodeHTML(ans)),
      }));

      setState(prev => ({
        ...prev,
        questions: decodedQuestions,
        isLoading: false,
        currentQuestionIndex: 0,
        userAnswers: [],
        selectedAnswer: '',
        isQuizComplete: false,
        score: 0,
        timeLeft: 30,
        difficulty,
      }));
      setQuestionStartTime(Date.now());
      setUsingFallback(false);
    } catch (error) {
      // Silently fallback to offline questions
      loadOfflineQuestions(difficulty);
    }
  };

  const decodeHTML = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const handleAnswerSelect = (answer: string) => {
    setState(prev => ({ ...prev, selectedAnswer: answer }));
  };

  const handleAnswerSubmit = (answer: string = state.selectedAnswer, isSkipped: boolean = false) => {
    // Validate that we have questions and a valid current question
    if (!state.questions.length || state.currentQuestionIndex >= state.questions.length) {
      return;
    }

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) {
      return;
    }

    const finalAnswer = isSkipped ? '' : answer;
    const isCorrect = finalAnswer === currentQuestion.correct_answer;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    const userAnswer: UserAnswer = {
      question: currentQuestion.question,
      userAnswer: finalAnswer || 'Skipped',
      correctAnswer: currentQuestion.correct_answer,
      isCorrect,
      timeSpent,
    };

    const newUserAnswers = [...state.userAnswers, userAnswer];
    const newScore = isCorrect ? state.score + 1 : state.score;

    if (state.currentQuestionIndex + 1 >= state.questions.length) {
      // Quiz complete
      setState(prev => ({
        ...prev,
        userAnswers: newUserAnswers,
        score: newScore,
        isQuizComplete: true,
      }));
      
      // Save high score
      const newHighScores = [...highScores, newScore].sort((a, b) => b - a).slice(0, 5);
      setHighScores(newHighScores);
      localStorage.setItem('quizHighScores', JSON.stringify(newHighScores));
    } else {
      // Next question
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        userAnswers: newUserAnswers,
        score: newScore,
        selectedAnswer: '',
        timeLeft: 30,
      }));
      setQuestionStartTime(Date.now());
    }
  };

  const handleSkipQuestion = () => {
    handleAnswerSubmit('', true);
  };

  const handlePreviousQuestion = () => {
    if (state.currentQuestionIndex > 0 && state.questions.length > 0) {
      const previousIndex = state.currentQuestionIndex - 1;
      const previousAnswer = state.userAnswers[previousIndex];
      
      setState(prev => ({
        ...prev,
        currentQuestionIndex: previousIndex,
        selectedAnswer: previousAnswer?.userAnswer === 'Skipped' ? '' : (previousAnswer?.userAnswer || ''),
      }));
    }
  };

  const handleRestartQuiz = () => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: 0,
      userAnswers: [],
      selectedAnswer: '',
      isQuizComplete: false,
      score: 0,
      timeLeft: 30,
    }));
    setQuestionStartTime(Date.now());
  };

  const startNewQuiz = (difficulty: string = state.difficulty) => {
    // If offline, automatically use offline questions
    if (!isOnline) {
      loadOfflineQuestions(difficulty);
    } else {
      fetchQuestions(difficulty);
    }
  };

  const toggleTimer = () => {
    setState(prev => ({ ...prev, timerEnabled: !prev.timerEnabled, timeLeft: 30 }));
  };

  const toggleOfflineMode = () => {
    setState(prev => ({ ...prev, useOfflineMode: !prev.useOfflineMode }));
  };

  if (state.isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading quiz questions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
          <Button onClick={() => startNewQuiz()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.questions.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Quiz App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block mb-2">Select Difficulty:</label>
              <Select value={state.difficulty} onValueChange={(value) => setState(prev => ({ ...prev, difficulty: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={toggleTimer}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Timer: {state.timerEnabled ? 'ON' : 'OFF'}
              </Button>
              
              <Button
                variant="outline"
                onClick={toggleOfflineMode}
                className="flex items-center gap-2"
                disabled={!isOnline}
              >
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                Offline: {state.useOfflineMode || !isOnline ? 'ON' : 'OFF'}
              </Button>
            </div>

            {(state.useOfflineMode || !isOnline) && (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {!isOnline ? 'You\'re offline' : 'Offline mode enabled'} - using local questions only
              </div>
            )}

            <Button onClick={() => startNewQuiz()} className="w-full">
              {!isOnline ? 'Start Offline Quiz' : 'Start Quiz'}
            </Button>

            {highScores.length > 0 && (
              <div>
                <h3 className="mb-2">High Scores:</h3>
                <div className="flex gap-2 flex-wrap">
                  {highScores.map((score, index) => (
                    <Badge key={index} variant="secondary">
                      {score}/10
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.isQuizComplete) {
    return (
      <Results
        userAnswers={state.userAnswers}
        score={state.score}
        totalQuestions={state.questions.length}
        onRestart={handleRestartQuiz}
        onNewQuiz={() => startNewQuiz()}
        highScores={highScores}
      />
    );
  }

  const currentQuestion = state.questions[state.currentQuestionIndex];
  
  // Safety check to prevent rendering if currentQuestion is undefined
  if (!currentQuestion) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading question...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Progress and Timer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">
              Question {state.currentQuestionIndex + 1} of {state.questions.length}
            </span>
            {state.timerEnabled && (
              <Badge variant={state.timeLeft <= 10 ? "destructive" : "secondary"} className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {state.timeLeft}s
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-muted-foreground">Score: {state.score}</span>
            <div className="flex gap-2">
              {usingFallback && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
              <Badge variant="outline">{currentQuestion.difficulty}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <QuestionComponent
        question={currentQuestion}
        selectedAnswer={state.selectedAnswer}
        onAnswerSelect={handleAnswerSelect}
        questionNumber={state.currentQuestionIndex + 1}
      />

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={state.currentQuestionIndex === 0}
              className="sm:w-auto w-full"
            >
              ← Previous
            </Button>
            
            <div className="flex gap-2 sm:w-auto w-full">
              <Button
                variant="ghost"
                onClick={handleSkipQuestion}
                className="sm:w-auto flex-1"
              >
                Skip
              </Button>
              
              <Button
                onClick={() => handleAnswerSubmit()}
                disabled={!state.selectedAnswer}
                className="sm:w-auto flex-1 min-w-24"
              >
                {state.currentQuestionIndex + 1 === state.questions.length ? 'Finish Quiz' : 'Next →'}
              </Button>
            </div>
          </div>
          
          <div className="sm:hidden text-xs text-muted-foreground text-center mt-2">
            Tap to select • Enter to continue
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
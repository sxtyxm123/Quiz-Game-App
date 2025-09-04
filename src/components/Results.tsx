import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { UserAnswer } from './Quiz';
import { Trophy, RotateCcw, Play, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ResultsProps {
  userAnswers: UserAnswer[];
  score: number;
  totalQuestions: number;
  onRestart: () => void;
  onNewQuiz: () => void;
  highScores: number[];
}

export function Results({ 
  userAnswers, 
  score, 
  totalQuestions, 
  onRestart, 
  onNewQuiz, 
  highScores 
}: ResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const totalTime = userAnswers.reduce((sum, answer) => sum + answer.timeSpent, 0);
  const averageTime = Math.round(totalTime / userAnswers.length);
  
  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = () => {
    if (percentage >= 90) return 'Excellent! 🎉';
    if (percentage >= 80) return 'Great job! 👏';
    if (percentage >= 70) return 'Good work! 👍';
    if (percentage >= 60) return 'Not bad! 📚';
    return 'Keep practicing! 💪';
  };

  const isNewHighScore = highScores.length === 0 || score > Math.max(...highScores.slice(0, 4));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Score Summary */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6" />
            Quiz Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className={`text-6xl font-bold ${getScoreColor()}`}>
            {score}/{totalQuestions}
          </div>
          <div className={`text-xl ${getScoreColor()}`}>
            {percentage}%
          </div>
          <p className="text-lg">{getScoreMessage()}</p>
          
          {isNewHighScore && (
            <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-yellow-50">
              🏆 New High Score!
            </Badge>
          )}

          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Total: {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Avg: {averageTime}s per question
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={onRestart} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Restart Quiz
            </Button>
            <Button onClick={onNewQuiz} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              New Quiz
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userAnswers.map((answer, index) => (
            <div key={index}>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {answer.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">
                      Question {index + 1}: {answer.question}
                    </p>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Your answer:</span>
                        <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                          {answer.userAnswer}
                        </Badge>
                      </div>
                      
                      {!answer.isCorrect && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Correct answer:</span>
                          <Badge variant="outline" className="border-green-600 text-green-600">
                            {answer.correctAnswer}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{answer.timeSpent}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {index < userAnswers.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* High Scores */}
      {highScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              High Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {highScores.map((highScore, index) => (
                <div key={index} className="text-center">
                  <Badge 
                    variant={highScore === score ? "default" : "secondary"}
                    className="w-full"
                  >
                    #{index + 1}: {highScore}/10
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
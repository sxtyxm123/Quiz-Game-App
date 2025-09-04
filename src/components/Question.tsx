import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Question } from './Quiz';

interface QuestionProps {
  question: Question;
  selectedAnswer: string;
  onAnswerSelect: (answer: string) => void;
  questionNumber: number;
}

export function QuestionComponent({ 
  question, 
  selectedAnswer, 
  onAnswerSelect, 
  questionNumber 
}: QuestionProps) {
  // Shuffle answers to randomize the order
  const allAnswers = React.useMemo(() => {
    const answers = [...question.incorrect_answers, question.correct_answer];
    return answers.sort(() => Math.random() - 0.5);
  }, [question]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key;
      if (key >= '1' && key <= '4') {
        const index = parseInt(key) - 1;
        if (index < allAnswers.length) {
          onAnswerSelect(allAnswers[index]);
        }
      } else if (key.toLowerCase() >= 'a' && key.toLowerCase() <= 'd') {
        const index = key.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
        if (index < allAnswers.length) {
          onAnswerSelect(allAnswers[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);u
          </CardTitle>
          
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        
        {allAnswers.map((answer, index) => (
          <Button
            key={`${answer}-${index}`}
            variant={selectedAnswer === answer ? "default" : "outline"}
            className="w-full text-left justify-start h-auto p-4 whitespace-normal focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => onAnswerSelect(answer)}
            aria-pressed={selectedAnswer === answer}
            aria-describedby={`question-${questionNumber}`}
          >
            <span className="mr-3 flex-shrink-0 bg-muted rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="flex-1">{answer}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

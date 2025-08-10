import { html } from 'lit-html';

export const questionDisplayTemplate = (question, options, correctOptionIndex = null) => html`
  <a-entity position="0 3 -1">
    <a-entity position="0 5 0" text="color: red; width: 20; lineHeight: 50; letterSpacing: 3; color: white; value: ${question}"></a-entity>
    ${options.map((option, index) => {
      const isCorrect = correctOptionIndex !== null && index === correctOptionIndex;
      const planeColor = isCorrect ? "#00FF00" : "#333333";
      const textColor = isCorrect ? "#000000" : "#FFFFFF";
      return html`
        <a-entity position="${index % 2 === 0 ? -5 : 5} ${2 - Math.floor(index / 2) * 3} 0">
          <a-plane color="${planeColor}" width="8" height="2" opacity="${isCorrect ? '0.9' : '0.7'}">
          
            <a-text
              value="${['A', 'B', 'C', 'D'][index]}"
              color="${textColor}"
              align="center"
              position="-3.5 0.5 0.01"
              scale="2.2 2.2 2.2"></a-text>

            <a-entity position="0.5 0.3 0.1" text="color: red; width: 7; lineHeight: 50; letterSpacing: 4; color: ${textColor}; value: ${option}"></a-entity>
          </a-plane>
        </a-entity>
      `;
    })}
  </a-entity>
`;
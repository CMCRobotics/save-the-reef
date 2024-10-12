import { html, render } from 'lit-html';

class TeamLayout {
    constructor(parentElement){
        this.parentElement = parentElement;
    }

    createTeamLayouts() {
        const teamLayouts = html`
          <a-entity id="team-1" position="-9.5 0 0" rotation="0 90 0" arc-layout="radius: 10; startAngle: -40; endAngle: 40; itemSelector: .arc-item"></a-entity>
          <a-entity id="team-2" position="9.5 0 0" rotation="0 90 0" arc-layout="radius: 10; startAngle: -40; endAngle: 40; itemSelector: .arc-item"></a-entity>
        `;
        render(teamLayouts, this.parentElement);
      }


    renderPlayers(players) {
        const playerTemplate = (player) => html`
            <a-entity class="arc-item" look-towards="#camera" 
            animation-mixer="${player.properties['animation-mixer'] || 'clip: Idle; loop:repeat'}" 
            id="${player.nodeId}" 
            gltf-model="#player-model"
            texture-map="src: assets/players/skins/${player.properties.skin || 'alienA'}.png"
            scale="${player.properties.scale || '1 1 1'}">
            <a-text
                color="black"
                opacity="0.8"
                value="${player.properties.nickname || '...'}"
                width="1" align="center" position="0 0 2" label="overwrite:true"></a-text>
            </a-entity>
        `;

        const team1Players = Array.from(players.values())
            .filter(player => player.properties.active === 'true' && player.properties['team-id'] === 'team-1');
        
        const team2Players = Array.from(players.values())
            .filter(player => player.properties.active === 'true' && player.properties['team-id'] === 'team-2');

        const team1Template = html`
            ${team1Players.map(player => playerTemplate(player))}
        `;

        const team2Template = html`
            ${team2Players.map(player => playerTemplate(player))}
        `;

        const team1Element = this.parentElement.querySelector('#team-1');
        const team2Element = this.parentElement.querySelector('#team-2');

        if (team1Element) {
            render(team1Template, team1Element);
            team1Element.components['arc-layout'].update();
        }

        if (team2Element) {
            render(team2Template, team2Element);
            team2Element.components['arc-layout'].update();
        }
    }
}

export default TeamLayout;